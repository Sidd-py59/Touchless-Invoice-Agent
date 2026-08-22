from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.client import Client
from app.models.document import Document, DocumentStatus
from app.models.invoice import Invoice, InvoiceApprovalStatus, InvoiceStatus, InvoiceItem
from app.models.timesheet import Timesheet, TimesheetEntry, TimesheetStatus
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.models.employee import Employee
from app.models.payroll import PayrollMaster
from app.models.query import ClientQuery, QueryStatus
from app.schemas.finance import (
    AnalyticsData,
    DocumentDetail,
    DocumentListItem,
    DocumentListResponse,
    FinanceOverview,
    MonthlyAccuracy,
    MonthlyCount,
    QueryListItem,
    QueryListResponse,
    ResolveQueryRequest,
    SourceBreakdown,
    TimesheetDetail,
    TimesheetEntryItem,
    TimesheetListItem,
    TimesheetListResponse,
    ValidationResultItem,
    InvoiceDetail,
    InvoiceItemDetail,
    InvoiceListItem,
    InvoiceListResponse,
    GenerateInvoiceResponse,
    ClientListItem,
    ClientListResponse,
    ClientDetail,
    CreateClientRequest,
    ClientConfigSchema,
    UpdateClientConfigRequest,
    EmployeeListItem,
    EmployeeListResponse,
    CreateEmployeeRequest,
)

router = APIRouter(prefix="/finance", tags=["finance-dashboard"])


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=FinanceOverview)
async def get_overview(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_docs = (await db.execute(select(func.count()).select_from(Document))).scalar_one()

    docs_this_month = (
        await db.execute(
            select(func.count())
            .select_from(Document)
            .where(Document.uploaded_at >= month_start)
        )
    ).scalar_one()

    pending_validation = (
        await db.execute(
            select(func.count())
            .select_from(Timesheet)
            .where(Timesheet.status == TimesheetStatus.VALIDATION_PENDING)
        )
    ).scalar_one()

    validated = (
        await db.execute(
            select(func.count())
            .select_from(Timesheet)
            .where(Timesheet.status.in_([TimesheetStatus.VALIDATED, TimesheetStatus.APPROVED, TimesheetStatus.INVOICED]))
        )
    ).scalar_one()

    invoices_generated = (
        await db.execute(select(func.count()).select_from(Invoice))
    ).scalar_one()

    total_revenue_row = (
        await db.execute(select(func.sum(Invoice.grand_total)))
    ).scalar_one()
    total_revenue = total_revenue_row or 0

    # Source breakdown
    source_rows = (
        await db.execute(
            select(Document.source, func.count().label("cnt"))
            .group_by(Document.source)
        )
    ).all()
    source_breakdown = [SourceBreakdown(source=row.source, count=row.cnt) for row in source_rows]

    return FinanceOverview(
        total_documents=total_docs,
        documents_this_month=docs_this_month,
        pending_validation=pending_validation,
        validated=validated,
        invoices_generated=invoices_generated,
        total_revenue=total_revenue,
        source_breakdown=source_breakdown,
    )


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    source: str | None = Query(None),
    client_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Document, Client.name.label("client_name"))
        .join(Client, Document.client_id == Client.id)
        .order_by(Document.uploaded_at.desc())
    )

    if status:
        stmt = stmt.where(Document.status == status)
    if source:
        stmt = stmt.where(Document.source == source)
    if client_id:
        stmt = stmt.where(Document.client_id == client_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).all()

    items = [
        DocumentListItem(
            id=doc.id,
            client_id=doc.client_id,
            client_name=client_name,
            file_name=doc.file_name,
            source=doc.source.value,
            status=doc.status.value,
            uploaded_at=doc.uploaded_at,
        )
        for doc, client_name in rows
    ]

    return DocumentListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/documents/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Document, Client.name.label("client_name"))
            .join(Client, Document.client_id == Client.id)
            .where(Document.id == document_id)
        )
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    doc, client_name = row

    # A mixed document can have one timesheet per client; report the first as primary.
    timesheets = (
        await db.execute(
            select(Timesheet)
            .where(Timesheet.document_id == document_id)
            .order_by(Timesheet.id)
        )
    ).scalars().all()
    timesheet = timesheets[0] if timesheets else None

    extraction_count = (
        await db.execute(
            select(func.count())
            .select_from(Document)
            .join(Document.extractions)
            .where(Document.id == document_id)
        )
    ).scalar_one()

    return DocumentDetail(
        id=doc.id,
        client_id=doc.client_id,
        client_name=client_name,
        file_name=doc.file_name,
        file_path=doc.file_path,
        source=doc.source.value,
        mime_type=doc.mime_type,
        status=doc.status.value,
        uploaded_at=doc.uploaded_at,
        timesheet_id=timesheet.id if timesheet else None,
        timesheet_status=timesheet.status.value if timesheet else None,
        extraction_count=extraction_count,
    )


# ---------------------------------------------------------------------------
# Timesheets + Validation Queue
# ---------------------------------------------------------------------------

@router.get("/timesheets", response_model=TimesheetListResponse)
async def list_timesheets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    client_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Timesheet, Client.name.label("client_name"))
        .join(Client, Timesheet.client_id == Client.id)
        .order_by(Timesheet.created_at.desc())
    )

    if status:
        stmt = stmt.where(Timesheet.status == status)
    if client_id:
        stmt = stmt.where(Timesheet.client_id == client_id)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    items = []
    for ts, client_name in rows:
        entry_count = (
            await db.execute(
                select(func.count()).select_from(TimesheetEntry)
                .where(TimesheetEntry.timesheet_id == ts.id)
            )
        ).scalar_one()

        error_count = (
            await db.execute(
                select(func.count())
                .select_from(ValidationResult)
                .join(TimesheetEntry, ValidationResult.timesheet_entry_id == TimesheetEntry.id)
                .where(
                    TimesheetEntry.timesheet_id == ts.id,
                    ValidationResult.status == ValidationStatus.FAILED,
                    ValidationResult.resolved == False,
                )
            )
        ).scalar_one()

        items.append(
            TimesheetListItem(
                id=ts.id,
                client_id=ts.client_id,
                client_name=client_name,
                billing_period=f"{ts.billing_year}-{ts.billing_month:02d}",
                status=ts.status.value,
                entry_count=entry_count,
                error_count=error_count,
                created_at=ts.created_at,
            )
        )

    return TimesheetListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/timesheets/{timesheet_id}", response_model=TimesheetDetail)
async def get_timesheet(timesheet_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Timesheet, Client.name.label("client_name"))
            .join(Client, Timesheet.client_id == Client.id)
            .where(Timesheet.id == timesheet_id)
        )
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    ts, client_name = row

    entries_rows = (
        await db.execute(
            select(TimesheetEntry)
            .where(TimesheetEntry.timesheet_id == timesheet_id)
            .order_by(TimesheetEntry.id)
        )
    ).scalars().all()

    entry_items = []
    for entry in entries_rows:
        val_results = (
            await db.execute(
                select(ValidationResult)
                .where(ValidationResult.timesheet_entry_id == entry.id)
            )
        ).scalars().all()

        entry_items.append(
            TimesheetEntryItem(
                id=entry.id,
                employee_id=entry.employee_id,
                raw_employee_code=entry.raw_employee_code,
                raw_employee_name=entry.raw_employee_name,
                working_days=entry.working_days,
                ot_hours=entry.ot_hours,
                leave_days=entry.leave_days,
                confidence=entry.confidence,
                validation_results=[
                    ValidationResultItem(
                        id=v.id,
                        rule_name=v.rule_name,
                        status=v.status.value,
                        severity=v.severity.value,
                        message=v.message,
                        expected=v.expected,
                        actual=v.actual,
                        resolved=v.resolved,
                    )
                    for v in val_results
                ],
            )
        )

    return TimesheetDetail(
        id=ts.id,
        client_id=ts.client_id,
        client_name=client_name,
        billing_period=f"{ts.billing_year}-{ts.billing_month:02d}",
        status=ts.status.value,
        document_id=ts.document_id,
        entries=entry_items,
    )


@router.get("/validation-queue", response_model=TimesheetListResponse)
async def get_validation_queue(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Timesheets that have unresolved validation errors."""
    stmt = (
        select(Timesheet, Client.name.label("client_name"))
        .join(Client, Timesheet.client_id == Client.id)
        .where(Timesheet.status == TimesheetStatus.VALIDATION_PENDING)
        .order_by(Timesheet.created_at.desc())
    )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    items = []
    for ts, client_name in rows:
        entry_count = (
            await db.execute(
                select(func.count()).select_from(TimesheetEntry)
                .where(TimesheetEntry.timesheet_id == ts.id)
            )
        ).scalar_one()

        error_count = (
            await db.execute(
                select(func.count())
                .select_from(ValidationResult)
                .join(TimesheetEntry, ValidationResult.timesheet_entry_id == TimesheetEntry.id)
                .where(
                    TimesheetEntry.timesheet_id == ts.id,
                    ValidationResult.status == ValidationStatus.FAILED,
                    ValidationResult.resolved == False,
                )
            )
        ).scalar_one()

        items.append(
            TimesheetListItem(
                id=ts.id,
                client_id=ts.client_id,
                client_name=client_name,
                billing_period=f"{ts.billing_year}-{ts.billing_month:02d}",
                status=ts.status.value,
                entry_count=entry_count,
                error_count=error_count,
                created_at=ts.created_at,
            )
        )

    return TimesheetListResponse(total=total, page=page, page_size=page_size, items=items)


@router.put("/validation/{result_id}/resolve")
async def resolve_validation(result_id: int, resolved_by: str = "finance_team", db: AsyncSession = Depends(get_db)):
    result = (
        await db.execute(select(ValidationResult).where(ValidationResult.id == result_id))
    ).scalar_one_or_none()

    if not result:
        raise HTTPException(status_code=404, detail="Validation result not found")

    result.resolved = True
    result.resolved_by = resolved_by
    await db.commit()

    # Resume touchless automation: once the LAST blocking error on the
    # timesheet is resolved, mark it validated and run invoice generation,
    # approval, and sending automatically.
    entry = (
        await db.execute(
            select(TimesheetEntry).where(TimesheetEntry.id == result.timesheet_entry_id)
        )
    ).scalar_one_or_none()
    timesheet = None
    if entry:
        timesheet = (
            await db.execute(select(Timesheet).where(Timesheet.id == entry.timesheet_id))
        ).scalar_one_or_none()

    auto_invoice = None
    if timesheet and timesheet.status == TimesheetStatus.VALIDATION_PENDING:
        remaining_errors = (
            await db.execute(
                select(func.count())
                .select_from(ValidationResult)
                .join(TimesheetEntry, ValidationResult.timesheet_entry_id == TimesheetEntry.id)
                .where(
                    TimesheetEntry.timesheet_id == timesheet.id,
                    ValidationResult.status == ValidationStatus.FAILED,
                    ValidationResult.severity == ValidationSeverity.ERROR,
                    ValidationResult.resolved == False,
                )
            )
        ).scalar_one()

        if remaining_errors == 0:
            timesheet.status = TimesheetStatus.VALIDATED
            await db.commit()

            from app.core.config import settings
            if settings.AUTO_INVOICE:
                from app.finance_automation.invoice_creator import InvoiceService
                auto_invoice = await InvoiceService.auto_process(db, timesheet.id)

    return {
        "id": result_id,
        "resolved": True,
        "timesheet_id": timesheet.id if timesheet else None,
        "timesheet_status": timesheet.status.value if timesheet else None,
        "auto_invoice": auto_invoice,
    }


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

@router.post("/timesheets/{timesheet_id}/invoice", response_model=GenerateInvoiceResponse)
async def generate_invoice(timesheet_id: int, db: AsyncSession = Depends(get_db)):
    from app.finance_automation.invoice_creator import InvoiceService

    try:
        invoice = await InvoiceService.generate_invoice(db, timesheet_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return GenerateInvoiceResponse(
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        grand_total=invoice.grand_total,
        currency=invoice.currency,
        status=invoice.status.value,
    )


@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    client_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Invoice, Client.name.label("client_name"), Timesheet.billing_year, Timesheet.billing_month)
        .join(Client, Invoice.client_id == Client.id)
        .join(Timesheet, Invoice.timesheet_id == Timesheet.id)
        .order_by(Invoice.generated_at.desc())
    )

    if status:
        stmt = stmt.where(Invoice.status == status)
    if client_id:
        stmt = stmt.where(Invoice.client_id == client_id)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    items = [
        InvoiceListItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            client_id=inv.client_id,
            client_name=client_name,
            billing_period=f"{billing_year}-{billing_month:02d}",
            grand_total=inv.grand_total,
            currency=inv.currency,
            status=inv.status.value,
            approval_status=inv.approval_status.value,
            generated_at=inv.generated_at,
        )
        for inv, client_name, billing_year, billing_month in rows
    ]

    return InvoiceListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetail)
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Invoice, Client.name.label("client_name"), Timesheet.billing_year, Timesheet.billing_month)
            .join(Client, Invoice.client_id == Client.id)
            .join(Timesheet, Invoice.timesheet_id == Timesheet.id)
            .where(Invoice.id == invoice_id)
        )
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv, client_name, billing_year, billing_month = row

    items_rows = (
        await db.execute(select(InvoiceItem).where(InvoiceItem.invoice_id == invoice_id))
    ).scalars().all()

    return InvoiceDetail(
        id=inv.id,
        invoice_number=inv.invoice_number,
        client_id=inv.client_id,
        client_name=client_name,
        billing_period=f"{billing_year}-{billing_month:02d}",
        invoice_date=str(inv.invoice_date),
        due_date=str(inv.due_date),
        currency=inv.currency,
        subtotal=inv.subtotal,
        service_charge=inv.service_charge,
        tax=inv.tax,
        grand_total=inv.grand_total,
        status=inv.status.value,
        approval_status=inv.approval_status.value,
        approved_by=inv.approved_by,
        invoice_pdf_path=inv.invoice_pdf_path,
        items=[
            InvoiceItemDetail(
                id=item.id,
                employee_id=item.employee_id,
                gross_salary=item.gross_salary,
                ot_amount=item.ot_amount,
                allowance=item.allowance,
                deduction=item.deduction,
                bill_amount=item.bill_amount,
            )
            for item in items_rows
        ],
    )


@router.put("/invoices/{invoice_id}/approve")
async def approve_invoice(invoice_id: int, approved_by: str = "finance_team", db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv.approval_status = InvoiceApprovalStatus.APPROVED
    inv.approved_by = approved_by
    inv.approved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": invoice_id, "approval_status": "approved"}


@router.put("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv.status = InvoiceStatus.SENT
    await db.commit()
    return {"id": invoice_id, "status": "sent"}


@router.get("/invoices/{invoice_id}/download")
async def download_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    from pathlib import Path
    from fastapi.responses import FileResponse

    inv = (await db.execute(select(Invoice).where(Invoice.id == invoice_id))).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not inv.invoice_pdf_path:
        raise HTTPException(status_code=404, detail="Invoice file not yet generated")

    path = Path(inv.invoice_pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Invoice file missing from disk")

    media_type = "application/pdf" if path.suffix == ".pdf" else "text/html"
    return FileResponse(
        path=str(path),
        media_type=media_type,
        filename=path.name,
    )


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

@router.get("/clients", response_model=ClientListResponse)
async def list_clients(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Client).order_by(Client.name)
    if active_only:
        stmt = stmt.where(Client.is_active == True)

    clients = (await db.execute(stmt)).scalars().all()

    items = []
    for client in clients:
        emp_count = (
            await db.execute(
                select(func.count()).select_from(Client).join(Client.employees).where(Client.id == client.id)
            )
        ).scalar_one()

        doc_count = (
            await db.execute(
                select(func.count()).select_from(Document).where(Document.client_id == client.id)
            )
        ).scalar_one()

        inv_count = (
            await db.execute(
                select(func.count()).select_from(Invoice).where(Invoice.client_id == client.id)
            )
        ).scalar_one()

        items.append(
            ClientListItem(
                id=client.id,
                name=client.name,
                email=client.email,
                is_active=client.is_active,
                employee_count=emp_count,
                document_count=doc_count,
                invoice_count=inv_count,
            )
        )

    return ClientListResponse(total=len(items), items=items)


@router.get("/clients/{client_id}", response_model=ClientDetail)
async def get_client(client_id: int, db: AsyncSession = Depends(get_db)):
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    emp_count = (
        await db.execute(
            select(func.count()).select_from(Client).join(Client.employees).where(Client.id == client_id)
        )
    ).scalar_one()

    doc_count = (
        await db.execute(
            select(func.count()).select_from(Document).where(Document.client_id == client_id)
        )
    ).scalar_one()

    inv_count = (
        await db.execute(
            select(func.count()).select_from(Invoice).where(Invoice.client_id == client_id)
        )
    ).scalar_one()

    total_revenue_row = (
        await db.execute(select(func.sum(Invoice.grand_total)).where(Invoice.client_id == client_id))
    ).scalar_one()

    return ClientDetail(
        id=client.id,
        name=client.name,
        email=client.email,
        billing_address=client.billing_address,
        is_active=client.is_active,
        total_revenue=total_revenue_row or 0,
        employee_count=emp_count,
        document_count=doc_count,
        invoice_count=inv_count,
    )


@router.post("/clients", response_model=ClientDetail, status_code=201)
async def create_client(body: CreateClientRequest, db: AsyncSession = Depends(get_db)):
    client = Client(
        name=body.name,
        email=body.email,
        billing_address=body.billing_address,
        is_active=True,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientDetail(
        id=client.id,
        name=client.name,
        email=client.email,
        billing_address=client.billing_address,
        is_active=client.is_active,
        total_revenue=0,
        employee_count=0,
        document_count=0,
        invoice_count=0,
    )


@router.get("/clients/{client_id}/config", response_model=ClientConfigSchema)
async def get_client_config(client_id: int, db: AsyncSession = Depends(get_db)):
    from app.repositories.client_repository import ClientRepository
    config = await ClientRepository.get_config(db, client_id)
    if not config:
        config = await ClientRepository.create_config(db=db, client_id=client_id)
        await db.commit()
    return config


@router.put("/clients/{client_id}/config", response_model=ClientConfigSchema)
async def update_client_config(
    client_id: int, body: UpdateClientConfigRequest, db: AsyncSession = Depends(get_db)
):
    from app.repositories.client_repository import ClientRepository
    config = await ClientRepository.get_config(db, client_id)
    if not config:
        config = await ClientRepository.create_config(db=db, client_id=client_id)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)
    return config


@router.get("/clients/{client_id}/employees", response_model=EmployeeListResponse)
async def list_client_employees(client_id: int, db: AsyncSession = Depends(get_db)):
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    emps = (await db.execute(select(Employee).where(Employee.client_id == client_id).order_by(Employee.employee_code))).scalars().all()

    items = []
    for emp in emps:
        payroll = (await db.execute(
            select(PayrollMaster).where(PayrollMaster.employee_id == emp.id, PayrollMaster.client_id == client_id)
        )).scalar_one_or_none()
        items.append(EmployeeListItem(
            id=emp.id,
            employee_code=emp.employee_code,
            first_name=emp.first_name,
            last_name=emp.last_name,
            email=emp.email,
            is_active=emp.is_active,
            basic_salary=payroll.basic_salary if payroll else None,
            allowance=payroll.allowance if payroll else None,
        ))

    return EmployeeListResponse(total=len(items), items=items)


@router.post("/clients/{client_id}/employees", response_model=EmployeeListItem, status_code=201)
async def create_employee(client_id: int, body: CreateEmployeeRequest, db: AsyncSession = Depends(get_db)):
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    existing = (await db.execute(select(Employee).where(Employee.employee_code == body.employee_code))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"Employee code {body.employee_code} already exists")

    emp = Employee(
        client_id=client_id,
        employee_code=body.employee_code,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        is_active=True,
    )
    db.add(emp)
    await db.flush()

    allowance = body.housing + body.transport + body.food + body.phone
    payroll = PayrollMaster(
        employee_id=emp.id,
        client_id=client_id,
        basic_salary=body.basic_salary,
        allowance=allowance,
        deduction=body.deduction,
        ot_rate_per_hour=body.ot_rate_per_hour,
        currency=body.currency,
    )
    db.add(payroll)
    await db.commit()
    await db.refresh(emp)

    return EmployeeListItem(
        id=emp.id,
        employee_code=emp.employee_code,
        first_name=emp.first_name,
        last_name=emp.last_name,
        email=emp.email,
        is_active=emp.is_active,
        basic_salary=payroll.basic_salary,
        allowance=payroll.allowance,
    )


# ---------------------------------------------------------------------------
# Analytics (real DB data)
# ---------------------------------------------------------------------------

@router.get("/analytics", response_model=AnalyticsData)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    months_abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Monthly invoice counts (SQLite strftime)
    inv_rows = (await db.execute(
        select(
            func.strftime("%Y", Invoice.generated_at).label("yr"),
            func.strftime("%m", Invoice.generated_at).label("mo"),
            func.count().label("cnt"),
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
    )).all()

    invoices_series = [
        MonthlyCount(month=months_abbr[int(r.mo) - 1], value=r.cnt)
        for r in inv_rows[-6:]
    ]

    # Monthly AI accuracy (avg confidence from timesheet entries)
    acc_rows = (await db.execute(
        select(
            func.strftime("%Y", TimesheetEntry.created_at).label("yr"),
            func.strftime("%m", TimesheetEntry.created_at).label("mo"),
            func.avg(TimesheetEntry.confidence).label("avg_conf"),
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
    )).all()

    accuracy_series = [
        MonthlyAccuracy(
            week=months_abbr[int(r.mo) - 1],
            aiAccuracy=round(float(r.avg_conf or 1.0) * 100, 1),
            processingTime=0.0,
        )
        for r in acc_rows[-6:]
    ]

    return AnalyticsData(
        invoices_generated=invoices_series,
        processing_and_accuracy=accuracy_series,
    )


# ---------------------------------------------------------------------------
# SAP-ready Excel export
# ---------------------------------------------------------------------------

@router.get("/timesheets/{timesheet_id}/export")
async def export_timesheet_excel(timesheet_id: int, db: AsyncSession = Depends(get_db)):
    import io
    import openpyxl
    from fastapi.responses import StreamingResponse

    row = (await db.execute(
        select(Timesheet, Client.name.label("client_name"))
        .join(Client, Timesheet.client_id == Client.id)
        .where(Timesheet.id == timesheet_id)
    )).first()

    if not row:
        raise HTTPException(status_code=404, detail="Timesheet not found")

    ts, client_name = row

    entries = (await db.execute(
        select(
            TimesheetEntry,
            Employee.employee_code,
            Employee.first_name,
            Employee.last_name,
            PayrollMaster.basic_salary,
            PayrollMaster.ot_rate_per_hour,
            PayrollMaster.allowance,
            PayrollMaster.deduction,
        )
        .outerjoin(Employee, TimesheetEntry.employee_id == Employee.id)
        .outerjoin(
            PayrollMaster,
            (PayrollMaster.employee_id == TimesheetEntry.employee_id)
            & (PayrollMaster.client_id == ts.client_id),
        )
        .where(TimesheetEntry.timesheet_id == timesheet_id)
    )).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Timesheet"

    ws.append([
        "Employee Code", "Employee Name", "Client", "Billing Period",
        "Working Days", "OT Hours", "Leave Days",
        "Basic Salary", "OT Rate/Hr", "OT Amount", "Allowance", "Deduction",
        "Net Billable", "Currency", "AI Confidence %",
    ])

    for entry, emp_code, first_name, last_name, basic_sal, ot_rate, allowance, deduction in entries:
        code = emp_code or entry.raw_employee_code or ""
        name = f"{first_name or ''} {last_name or ''}".strip() or entry.raw_employee_name or ""

        b_sal = float(entry.salary_basic or basic_sal or 0)
        ot_r = float(ot_rate or 0)
        ot_hrs = float(entry.ot_hours or 0)
        ot_amt = float(entry.salary_ot_amount) if entry.salary_ot_amount else round(ot_r * ot_hrs, 2)
        allw = float(entry.salary_allowance or allowance or 0)
        dedu = float(entry.salary_deduction or deduction or 0)
        gross = round(b_sal * (float(entry.working_days) / 30.0), 2)
        net = round(gross + ot_amt + allw - dedu, 2)

        ws.append([
            code, name, client_name, f"{ts.billing_year}-{ts.billing_month:02d}",
            float(entry.working_days), ot_hrs, float(entry.leave_days),
            round(b_sal, 2), round(ot_r, 2), ot_amt, round(allw, 2), round(dedu, 2),
            net, "AED", round(entry.confidence * 100, 1),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"TIA_SAP_{client_name.replace(' ', '_')}_{ts.billing_year}-{ts.billing_month:02d}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Client Queries (FinOps inbox)
# ---------------------------------------------------------------------------

@router.get("/queries", response_model=QueryListResponse)
async def list_queries(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ClientQuery, Client.name.label("client_name"))
        .join(Client, ClientQuery.client_id == Client.id)
        .order_by(ClientQuery.created_at.desc())
    )
    if status:
        stmt = stmt.where(ClientQuery.status == status)

    rows = (await db.execute(stmt)).all()
    items = [
        QueryListItem(
            id=q.id,
            client_id=q.client_id,
            client_name=client_name,
            invoice_id=q.invoice_id,
            subject=q.subject,
            body=q.body,
            status=q.status.value,
            resolution_note=q.resolution_note,
            resolved_by=q.resolved_by,
            created_at=q.created_at,
        )
        for q, client_name in rows
    ]
    return QueryListResponse(total=len(items), items=items)


@router.put("/queries/{query_id}/resolve")
async def resolve_query(query_id: int, body: ResolveQueryRequest, db: AsyncSession = Depends(get_db)):
    q = (await db.execute(select(ClientQuery).where(ClientQuery.id == query_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")

    q.status = QueryStatus.RESOLVED
    q.resolution_note = body.resolution_note
    q.resolved_by = body.resolved_by
    await db.commit()
    return {"id": query_id, "status": "resolved"}
