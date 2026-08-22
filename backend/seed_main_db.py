import asyncio
from decimal import Decimal
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.models import Base
from app.repositories.client_repository import ClientRepository
from app.repositories.employee_repository import EmployeeRepository


async def seed_main():
    db_path = Path(__file__).resolve().parent / "tia.db"
    print(f"Connecting to live database at: {db_path}")

    # Use live database URL
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)

    # Apply database migrations/tables if not present
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        print("\nSeeding Master Data...")

        # 1. Seed Emaar Properties PJSC
        client_emaar = await ClientRepository.create(
            db, name="Emaar Properties PJSC", email="finance@emaar.ae", billing_address="Emaar Square, Downtown Dubai, UAE"
        )
        await ClientRepository.create_config(
            db,
            client_id=client_emaar.id,
            currency="AED",
            service_charge_percentage=Decimal("8.00"),
            tax_percentage=Decimal("10.00"),
            max_working_days=Decimal("22.00"),
            max_ot_hours=Decimal("10.00"),
            invoice_prefix="EMA",
        )
        print(f"[OK] Seeded Client: Emaar Properties PJSC (ID: {client_emaar.id})")

        # Seed Employees for Emaar
        emp_alice = await EmployeeRepository.create(
            db, client_id=client_emaar.id, employee_code="TASC-0003", first_name="Alice", last_name="Cooper", email="alice@emaar.ae"
        )
        emp_bob = await EmployeeRepository.create(
            db, client_id=client_emaar.id, employee_code="TASC-0004", first_name="Bob", last_name="Marley", email="bob@emaar.ae"
        )
        print(f"[OK] Seeded Employees: Alice Cooper (TASC-0003), Bob Marley (TASC-0004)")

        # Seed Payroll
        await EmployeeRepository.create_payroll(
            db,
            employee_id=emp_alice.id,
            client_id=client_emaar.id,
            basic_salary=Decimal("15000.00"),
            ot_rate_per_hour=Decimal("75.00"),
            allowance=Decimal("2000.00"),
            deduction=Decimal("500.00")
        )
        await EmployeeRepository.create_payroll(
            db,
            employee_id=emp_bob.id,
            client_id=client_emaar.id,
            basic_salary=Decimal("18000.00"),
            ot_rate_per_hour=Decimal("90.00"),
            allowance=Decimal("0.00"),
            deduction=Decimal("1000.00")
        )
        print("[OK] Seeded Payroll contracts for Alice and Bob.")

        # 2. Seed Al-Futtaim Logistics
        client_futtaim = await ClientRepository.create(
            db, name="Al-Futtaim Logistics", email="finance@alfuttaim.ae", billing_address="Dubai Festival City, Dubai, UAE"
        )
        await ClientRepository.create_config(
            db,
            client_id=client_futtaim.id,
            currency="AED",
            service_charge_percentage=Decimal("10.00"),
            tax_percentage=Decimal("5.00"),
            max_working_days=Decimal("26.00"),
            max_ot_hours=Decimal("15.00"),
            invoice_prefix="AFL",
        )
        print(f"[OK] Seeded Client: Al-Futtaim Logistics (ID: {client_futtaim.id})")

        # Seed Employees for Al-Futtaim
        emp_john = await EmployeeRepository.create(
            db, client_id=client_futtaim.id, employee_code="TASC-0001", first_name="John", last_name="Doe", email="john@futtaim.ae"
        )
        emp_jane = await EmployeeRepository.create(
            db, client_id=client_futtaim.id, employee_code="TASC-0002", first_name="Jane", last_name="Smith", email="jane@futtaim.ae"
        )
        print(f"[OK] Seeded Employees: John Doe (TASC-0001), Jane Smith (TASC-0002)")

        # Seed Payroll
        await EmployeeRepository.create_payroll(
            db,
            employee_id=emp_john.id,
            client_id=client_futtaim.id,
            basic_salary=Decimal("12000.00"),
            ot_rate_per_hour=Decimal("60.00"),
            allowance=Decimal("1500.00"),
            deduction=Decimal("200.00")
        )
        await EmployeeRepository.create_payroll(
            db,
            employee_id=emp_jane.id,
            client_id=client_futtaim.id,
            basic_salary=Decimal("14000.00"),
            ot_rate_per_hour=Decimal("70.00"),
            allowance=Decimal("1800.00"),
            deduction=Decimal("300.00")
        )
        print("[OK] Seeded Payroll contracts for John and Jane.")

        await db.commit()
        print("\n" + "=" * 50)
        print("SUCCESS: Live database tia.db seeded successfully!")
        print("=" * 50)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_main())
