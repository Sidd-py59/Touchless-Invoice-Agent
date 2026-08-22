import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from jinja2 import Environment, FileSystemLoader

from app.models.invoice import Invoice, InvoiceItem, InvoiceApprovalStatus, InvoiceStatus
from app.models.timesheet import Timesheet, TimesheetStatus
from app.repositories.client_repository import ClientRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.repositories.timesheet_repository import TimesheetRepository


class InvoiceService:
    """
    Invoice Generation Service (Layer 3 - Finance Automation).
    Calculates pro-rated salaries, overtime earnings, service charges, and taxes.
    Generates Jinja2-rendered PDF/HTML invoices.
    """

    AUTOMATION_ACTOR = "tia-automation"

    @staticmethod
    async def auto_process(db: AsyncSession, timesheet_id: int) -> dict[str, Any]:
        """
        Touchless pipeline step: for a cleanly VALIDATED timesheet, generate the
        invoice, approve it, and mark it sent — no human action required.
        Timesheets that still have validation errors are skipped so they stay in
        the human review queue. Returns a summary dict describing what happened.
        """
        timesheet = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not timesheet:
            return {
                "timesheet_id": timesheet_id,
                "client_id": None,
                "invoice_id": None,
                "invoice_number": None,
                "status": "failed",
                "error": "Timesheet not found.",
            }

        if timesheet.status not in (TimesheetStatus.VALIDATED, TimesheetStatus.APPROVED):
            return {
                "timesheet_id": timesheet_id,
                "client_id": timesheet.client_id,
                "invoice_id": None,
                "invoice_number": None,
                "status": "skipped",
                "error": (
                    f"Timesheet status is '{timesheet.status.value}'; "
                    "resolve validation issues before invoicing."
                ),
            }

        try:
            invoice = await InvoiceService.generate_invoice(db, timesheet_id)
            invoice.approval_status = InvoiceApprovalStatus.APPROVED
            invoice.approved_by = InvoiceService.AUTOMATION_ACTOR
            invoice.approved_at = datetime.utcnow()
            invoice.status = InvoiceStatus.SENT
            await db.commit()
            return {
                "timesheet_id": timesheet_id,
                "client_id": invoice.client_id,
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "grand_total": str(invoice.grand_total),
                "currency": invoice.currency,
                "status": "generated",
                "approval_status": invoice.approval_status.value,
                "invoice_status": invoice.status.value,
                "error": None,
            }
        except Exception as exc:  # keep ingestion resilient on render/data errors
            await db.rollback()
            return {
                "timesheet_id": timesheet_id,
                "client_id": timesheet.client_id,
                "invoice_id": None,
                "invoice_number": None,
                "status": "failed",
                "error": str(exc),
            }

    @staticmethod
    async def generate_invoice(db: AsyncSession, timesheet_id: int) -> Invoice:
        # 1. Fetch timesheet header
        timesheet = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not timesheet:
            raise ValueError(f"Timesheet with ID {timesheet_id} not found.")

        # Warn if timesheet is not validated, but still allow invoice compilation
        if timesheet.status not in (TimesheetStatus.VALIDATED, TimesheetStatus.APPROVED):
            print(f"Warning: Timesheet {timesheet_id} is in status '{timesheet.status.value}', not 'validated'.")

        # 2. Fetch client configuration terms
        client_config = await ClientRepository.get_config(db, timesheet.client_id)
        if not client_config:
            client_config = await ClientRepository.create_config(
                db=db, client_id=timesheet.client_id
            )

        # 3. Create unique invoice number
        year_str = str(timesheet.billing_year)
        month_str = f"{timesheet.billing_month:02d}"
        prefix = client_config.invoice_prefix or "INV"
        invoice_number = f"{prefix}-{year_str}-{month_str}-{timesheet.id:04d}"

        # Delete existing invoice for this timesheet if it already exists to allow re-runs
        existing_invoice = await InvoiceRepository.get_by_timesheet(db, timesheet.id)
        if existing_invoice:
            await db.delete(existing_invoice)
            await db.flush()

        # 4. Fetch timesheet entries
        entries = await TimesheetRepository.get_entries(db, timesheet_id)
        
        invoice_items_to_create = []
        subtotal = Decimal("0.00")

        # 5. Process entries and calculate wages
        for entry in entries:
            # Skip entries where employee could not be resolved
            if not entry.employee_id:
                continue

            # Never bill an employee under another client's invoice — such rows
            # belong to that client's own timesheet/invoice.
            employee = await EmployeeRepository.get_by_id(db, entry.employee_id)
            if not employee or employee.client_id != timesheet.client_id:
                continue

            # Use per-period salary values from the source file when available;
            # otherwise fall back to the DB payroll master rates.
            if entry.salary_basic is not None and entry.salary_basic > Decimal("0"):
                gross_salary = (entry.salary_basic * (entry.working_days / Decimal("30.00"))).quantize(Decimal("1.00"))
                allowance = entry.salary_allowance or Decimal("0.00")
                deduction = entry.salary_deduction or Decimal("0.00")
                ot_amount = (entry.salary_ot_amount or Decimal("0.00")).quantize(Decimal("1.00"))
            else:
                payroll = await EmployeeRepository.get_payroll(
                    db, entry.employee_id, timesheet.client_id
                )
                if not payroll:
                    # Employee has no payroll contract under this client — skip (client mismatch)
                    continue
                basic = payroll.basic_salary
                allowance = payroll.allowance
                deduction = payroll.deduction
                gross_salary = (basic * (entry.working_days / Decimal("30.00"))).quantize(Decimal("1.00"))
                ot_amount = (payroll.ot_rate_per_hour * entry.ot_hours).quantize(Decimal("1.00"))

            # Bill amount = pro-rated gross + overtime + allowance - deduction
            bill_amount = (gross_salary + ot_amount + allowance - deduction).quantize(Decimal("1.00"))

            invoice_items_to_create.append({
                "employee_id": entry.employee_id,
                "gross_salary": gross_salary,
                "ot_amount": ot_amount,
                "allowance": allowance,
                "deduction": deduction,
                "bill_amount": bill_amount
            })
            
            subtotal += bill_amount

        # 6. Compute taxes and service fees from Client Configurations
        service_charge = (subtotal * (client_config.service_charge_percentage / Decimal("100.00"))).quantize(Decimal("1.00"))
        tax = ((subtotal + service_charge) * (client_config.tax_percentage / Decimal("100.00"))).quantize(Decimal("1.00"))
        grand_total = subtotal + service_charge + tax

        # 7. Create Invoice Header
        invoice = await InvoiceRepository.create(
            db=db,
            invoice_number=invoice_number,
            client_id=timesheet.client_id,
            timesheet_id=timesheet.id,
            invoice_date=date.today(),
            due_date=date.today(),  # Immediate due date by default
            currency=client_config.currency,
            subtotal=subtotal,
            service_charge=service_charge,
            tax=tax,
            grand_total=grand_total,
            approval_status=InvoiceApprovalStatus.PENDING
        )

        # 8. Create Invoice Items
        for item_data in invoice_items_to_create:
            await InvoiceRepository.create_item(
                db=db,
                invoice_id=invoice.id,
                **item_data
            )

        # 9. Trigger PDF/HTML Compilation
        await db.flush()
        pdf_path = await InvoiceService._render_pdf(db, invoice, timesheet, client_config)
        invoice.invoice_pdf_path = pdf_path
        
        # 10. Advance Timesheet Status
        await TimesheetRepository.update_status(db, timesheet.id, TimesheetStatus.INVOICED)

        await db.commit()
        return invoice

    @staticmethod
    async def _render_pdf(db: AsyncSession, invoice: Invoice, timesheet: Timesheet, client_config=None) -> str:
        """
        Compiles HTML template and renders a PDF document via xhtml2pdf.
        Falls back to HTML if PDF generation fails.
        """
        from sqlalchemy import select
        from app.models.client import Client
        from app.models.invoice import InvoiceItem

        client_res = await db.execute(select(Client).where(Client.id == invoice.client_id))
        client = client_res.scalars().first()

        items_res = await db.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id))
        items = items_res.scalars().all()

        # Setup output paths
        project_root = Path(__file__).resolve().parent.parent.parent
        output_dir = project_root / "invoices_output"
        output_dir.mkdir(parents=True, exist_ok=True)

        html_out_path = output_dir / f"{invoice.invoice_number}.html"
        pdf_out_path = output_dir / f"{invoice.invoice_number}.pdf"

        # Load Template Engine from Layer 3 Templates subpackage
        template_dir = Path(__file__).resolve().parent / "templates"
        template_dir.mkdir(parents=True, exist_ok=True)

        # Create basic template if it does not exist
        default_template_path = template_dir / "invoice.html"
        if not default_template_path.exists():
            InvoiceService._create_default_template(default_template_path)

        env = Environment(loader=FileSystemLoader(str(template_dir)))
        template = env.get_template("invoice.html")

        # Build employee name lookup
        from app.models.employee import Employee
        emp_ids = [item.employee_id for item in items if item.employee_id]
        emp_name_map: dict[int, str] = {}
        emp_code_map: dict[int, str] = {}
        if emp_ids:
            from sqlalchemy import select as sa_select
            emp_res = await db.execute(sa_select(Employee).where(Employee.id.in_(emp_ids)))
            for emp in emp_res.scalars().all():
                emp_name_map[emp.id] = f"{emp.first_name} {emp.last_name}"
                emp_code_map[emp.id] = emp.employee_code or f"EMP-{emp.id}"

        # Compile HTML context
        html_content = template.render(
            invoice=invoice,
            client=client,
            items=items,
            timesheet=timesheet,
            emp_name_map=emp_name_map,
            emp_code_map=emp_code_map,
            generated_at_str=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            brand_color=getattr(client_config, "brand_color", "#1a56db") if client_config else "#1a56db",
            payment_terms_days=getattr(client_config, "payment_terms_days", 30) if client_config else 30,
            invoice_notes=getattr(client_config, "invoice_notes", None) if client_config else None,
            logo_url=getattr(client_config, "logo_url", None) if client_config else None,
        )

        # Save HTML intermediate file
        html_out_path.write_text(html_content, encoding="utf-8")

        # Render PDF via xhtml2pdf (pure Python, no system GTK/GObject needed)
        try:
            from xhtml2pdf import pisa
            print("Rendering PDF via xhtml2pdf...")
            with open(str(pdf_out_path), "wb") as pdf_file:
                result = pisa.CreatePDF(html_content, dest=pdf_file, encoding="utf-8")
            if not result.err:
                return str(pdf_out_path)
            print(f"xhtml2pdf reported errors: {result.err}. Falling back to HTML format.")
            return str(html_out_path)
        except Exception as e:
            print(f"PDF rendering failed: {e}. Falling back to HTML format.")
            return str(html_out_path)

    @staticmethod
    def _create_default_template(path: Path) -> None:
        """Creates a beautiful HTML-based print-ready stylesheet template."""
        content = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ invoice.invoice_number }}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
        .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #4A90E2; }
        .meta-table { width: 100%; margin-top: 30px; margin-bottom: 40px; border-collapse: collapse; }
        .meta-table td { padding: 8px; vertical-align: top; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .items-table th { background-color: #F5F5F5; border-bottom: 2px solid #ddd; padding: 12px; text-align: left; }
        .items-table td { border-bottom: 1px solid #EEE; padding: 12px; }
        .totals-section { display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; border-collapse: collapse; }
        .totals-table td { padding: 8px; border-bottom: 1px solid #EEE; }
        .grand-total { font-weight: bold; font-size: 18px; color: #4A90E2; }
        .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="invoice-header">
        <div>
            <div class="invoice-title">INVOICE</div>
            <div>Invoice Number: <strong>{{ invoice.invoice_number }}</strong></div>
            <div>Date: {{ invoice.invoice_date }}</div>
            <div>Due Date: {{ invoice.due_date }}</div>
        </div>
        <div style="text-align: right;">
            <strong>TASC Outsource Services</strong><br>
            Finance Operations Team<br>
            Dubai, UAE
        </div>
    </div>

    <table class="meta-table">
        <tr>
            <td>
                <strong>Billed To:</strong><br>
                {{ client.name }}<br>
                {{ client.billing_address or '' }}<br>
                {{ client.email or '' }}
            </td>
            <td style="text-align: right;">
                <strong>Timesheet Reference:</strong><br>
                Billing Period: {{ timesheet.billing_year }}-{{ "%02d"|format(timesheet.billing_month) }}<br>
                Status: {{ timesheet.status.value }}
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th>Employee Assignment ID</th>
                <th style="text-align: right;">Gross Salary (Pro-rated)</th>
                <th style="text-align: right;">Overtime Pay</th>
                <th style="text-align: right;">Allowance</th>
                <th style="text-align: right;">Deductions</th>
                <th style="text-align: right;">Total Bill Amount</th>
            </tr>
        </thead>
        <tbody>
            {% for item in items %}
            <tr>
                <td>Employee #{{ item.employee_id }}</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ item.gross_salary }}</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ item.ot_amount }}</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ item.allowance }}</td>
                <td style="text-align: right;">-{{ invoice.currency }} {{ item.deduction }}</td>
                <td style="text-align: right;"><strong>{{ invoice.currency }} {{ item.bill_amount }}</strong></td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="totals-section">
        <table class="totals-table">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ invoice.subtotal }}</td>
            </tr>
            <tr>
                <td>Service Fee:</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ invoice.service_charge }}</td>
            </tr>
            <tr>
                <td>Tax:</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ invoice.tax }}</td>
            </tr>
            <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right;">{{ invoice.currency }} {{ invoice.grand_total }}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <p>Thank you for your business. For any billing questions, contact finance@tasc.com.</p>
        <p>Generated at: {{ generated_at_str }}</p>
    </div>
</body>
</html>
"""
        path.write_text(content, encoding="utf-8")
