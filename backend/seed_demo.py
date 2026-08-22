"""
Demo data seeder for TIA hackathon.
Creates employees, payroll, and a ready-to-invoice timesheet for each client.
Safe to run multiple times (skips already-existing records).
"""
import asyncio
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.models import Base
from app.models.client import Client
from app.models.employee import Employee
from app.models.payroll import PayrollMaster
from app.models.timesheet import Timesheet, TimesheetEntry, TimesheetStatus
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.models.client_config import ClientConfig


DEMO_DATA = [
    {
        "client_name": "Emirates Steel Industries LLC",
        "currency": "AED",
        "service_charge_pct": Decimal("8.00"),
        "tax_pct": Decimal("5.00"),
        "invoice_prefix": "ESI",
        "employees": [
            {"code": "TASC-1001", "first": "Mohammed", "last": "Al Rashid", "basic": Decimal("14000"), "ot_rate": Decimal("70"), "allowance": Decimal("2000"), "deduction": Decimal("500")},
            {"code": "TASC-1002", "first": "Ahmed",    "last": "Hassan",    "basic": Decimal("12000"), "ot_rate": Decimal("60"), "allowance": Decimal("1500"), "deduction": Decimal("300")},
            {"code": "TASC-1003", "first": "Fatima",   "last": "Al Zaabi",  "basic": Decimal("16000"), "ot_rate": Decimal("80"), "allowance": Decimal("2500"), "deduction": Decimal("600")},
            {"code": "TASC-1004", "first": "Sara",     "last": "Ibrahim",   "basic": Decimal("11000"), "ot_rate": Decimal("55"), "allowance": Decimal("1200"), "deduction": Decimal("200")},
        ],
        "timesheet_entries": [
            {"code": "TASC-1001", "name": "Mohammed Al Rashid", "days": Decimal("22"), "ot": Decimal("8"),  "leave": Decimal("0")},
            {"code": "TASC-1002", "name": "Ahmed Hassan",       "days": Decimal("20"), "ot": Decimal("0"),  "leave": Decimal("2")},
            {"code": "TASC-1003", "name": "Fatima Al Zaabi",    "days": Decimal("22"), "ot": Decimal("12"), "leave": Decimal("0")},
            {"code": "TASC-1004", "name": "Sara Ibrahim",       "days": Decimal("18"), "ot": Decimal("0"),  "leave": Decimal("4")},
        ],
    },
    {
        "client_name": "Unassigned Ingestion Client",
        "currency": "AED",
        "service_charge_pct": Decimal("10.00"),
        "tax_pct": Decimal("5.00"),
        "invoice_prefix": "UIC",
        "employees": [
            {"code": "TASC-2001", "first": "John",  "last": "Mathew",  "basic": Decimal("13000"), "ot_rate": Decimal("65"), "allowance": Decimal("1800"), "deduction": Decimal("400")},
            {"code": "TASC-2002", "first": "Priya", "last": "Sharma",  "basic": Decimal("15000"), "ot_rate": Decimal("75"), "allowance": Decimal("2200"), "deduction": Decimal("500")},
            {"code": "TASC-2003", "first": "Ravi",  "last": "Kumar",   "basic": Decimal("10000"), "ot_rate": Decimal("50"), "allowance": Decimal("1000"), "deduction": Decimal("100")},
        ],
        "timesheet_entries": [
            {"code": "TASC-2001", "name": "John Mathew",  "days": Decimal("21"), "ot": Decimal("5"),  "leave": Decimal("1")},
            {"code": "TASC-2002", "name": "Priya Sharma", "days": Decimal("22"), "ot": Decimal("10"), "leave": Decimal("0")},
            {"code": "TASC-2003", "name": "Ravi Kumar",   "days": Decimal("19"), "ot": Decimal("0"),  "leave": Decimal("3")},
        ],
    },
    {
        "client_name": "Imported Client CL001",
        "currency": "AED",
        "service_charge_pct": Decimal("7.00"),
        "tax_pct": Decimal("5.00"),
        "invoice_prefix": "CL1",
        "employees": [
            {"code": "TASC-3001", "first": "Ali",    "last": "Jaber",   "basic": Decimal("17000"), "ot_rate": Decimal("85"), "allowance": Decimal("2800"), "deduction": Decimal("700")},
            {"code": "TASC-3002", "first": "Hana",   "last": "Al Mulla","basic": Decimal("13500"), "ot_rate": Decimal("67"), "allowance": Decimal("1600"), "deduction": Decimal("350")},
        ],
        "timesheet_entries": [
            {"code": "TASC-3001", "name": "Ali Jaber",    "days": Decimal("22"), "ot": Decimal("15"), "leave": Decimal("0")},
            {"code": "TASC-3002", "name": "Hana Al Mulla","days": Decimal("21"), "ot": Decimal("3"),  "leave": Decimal("1")},
        ],
    },
]


async def seed():
    db_path = Path(__file__).resolve().parent / "tia.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with session_factory() as db:
        for demo in DEMO_DATA:
            # 1. Find client
            client = (await db.execute(
                select(Client).where(Client.name == demo["client_name"])
            )).scalar_one_or_none()

            if not client:
                print(f"  [SKIP] Client not found: {demo['client_name']}")
                continue

            print(f"\n[CLIENT] {client.name} (id={client.id})")

            # 2. Upsert ClientConfig
            existing_cfg = (await db.execute(
                select(ClientConfig).where(ClientConfig.client_id == client.id)
            )).scalar_one_or_none()

            if not existing_cfg:
                cfg = ClientConfig(
                    client_id=client.id,
                    currency=demo["currency"],
                    service_charge_percentage=demo["service_charge_pct"],
                    tax_percentage=demo["tax_pct"],
                    invoice_prefix=demo["invoice_prefix"],
                    max_working_days=Decimal("22.00"),
                    max_ot_hours=Decimal("15.00"),
                )
                db.add(cfg)
                await db.flush()
                print(f"  [OK] ClientConfig created (prefix={demo['invoice_prefix']})")
            else:
                existing_cfg.service_charge_percentage = demo["service_charge_pct"]
                existing_cfg.tax_percentage = demo["tax_pct"]
                existing_cfg.invoice_prefix = demo["invoice_prefix"]
                existing_cfg.currency = demo["currency"]
                print(f"  [OK] ClientConfig updated")

            # 3. Seed employees + payroll
            emp_map = {}
            for emp_data in demo["employees"]:
                emp = (await db.execute(
                    select(Employee).where(Employee.employee_code == emp_data["code"])
                )).scalar_one_or_none()

                if not emp:
                    emp = Employee(
                        client_id=client.id,
                        employee_code=emp_data["code"],
                        first_name=emp_data["first"],
                        last_name=emp_data["last"],
                        is_active=True,
                    )
                    db.add(emp)
                    await db.flush()
                    print(f"  [OK] Employee: {emp_data['first']} {emp_data['last']} ({emp_data['code']})")

                emp_map[emp_data["code"]] = emp.id

                # Upsert payroll
                existing_pay = (await db.execute(
                    select(PayrollMaster).where(
                        PayrollMaster.employee_id == emp.id,
                        PayrollMaster.client_id == client.id,
                    )
                )).scalar_one_or_none()

                if not existing_pay:
                    pay = PayrollMaster(
                        employee_id=emp.id,
                        client_id=client.id,
                        basic_salary=emp_data["basic"],
                        ot_rate_per_hour=emp_data["ot_rate"],
                        allowance=emp_data["allowance"],
                        deduction=emp_data["deduction"],
                    )
                    db.add(pay)
                    await db.flush()

            # 4. Check if a demo validated timesheet already exists for this client
            existing_ts = (await db.execute(
                select(Timesheet).where(
                    Timesheet.client_id == client.id,
                    Timesheet.status == TimesheetStatus.VALIDATED,
                )
            )).scalar_one_or_none()

            if existing_ts:
                print(f"  [SKIP] Demo validated timesheet already exists (id={existing_ts.id})")
                continue

            # 5. Create a validated demo timesheet
            ts = Timesheet(
                client_id=client.id,
                billing_year=2026,
                billing_month=6,
                status=TimesheetStatus.VALIDATED,
            )
            db.add(ts)
            await db.flush()
            print(f"  [OK] Timesheet created (id={ts.id}, status=validated)")

            for entry_data in demo["timesheet_entries"]:
                emp_id = emp_map.get(entry_data["code"])
                entry = TimesheetEntry(
                    timesheet_id=ts.id,
                    employee_id=emp_id,
                    raw_employee_code=entry_data["code"],
                    raw_employee_name=entry_data["name"],
                    working_days=entry_data["days"],
                    ot_hours=entry_data["ot"],
                    leave_days=entry_data["leave"],
                    confidence=1.0,
                )
                db.add(entry)

            await db.flush()
            print(f"  [OK] {len(demo['timesheet_entries'])} timesheet entries created")

        await db.commit()
        print("\n[SUCCESS] Demo data seeded.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
