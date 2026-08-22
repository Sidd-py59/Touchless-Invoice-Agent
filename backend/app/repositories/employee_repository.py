from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.employee import Employee
from app.models.payroll import PayrollMaster


class EmployeeRepository:
    """
    Repository class for Employee and PayrollMaster operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: int) -> Employee | None:
        result = await db.execute(select(Employee).where(Employee.id == employee_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_code(db: AsyncSession, employee_code: str) -> Employee | None:
        result = await db.execute(
            select(Employee).where(Employee.employee_code == employee_code)
        )
        return result.scalars().first()

    @staticmethod
    async def get_payroll(
        db: AsyncSession, employee_id: int, client_id: int
    ) -> PayrollMaster | None:
        result = await db.execute(
            select(PayrollMaster).where(
                PayrollMaster.employee_id == employee_id,
                PayrollMaster.client_id == client_id,
            )
        )
        return result.scalars().first()

    @staticmethod
    async def create(
        db: AsyncSession,
        client_id: int,
        employee_code: str,
        first_name: str,
        last_name: str,
        email: str | None = None,
    ) -> Employee:
        employee = Employee(
            client_id=client_id,
            employee_code=employee_code,
            first_name=first_name,
            last_name=last_name,
            email=email,
        )
        db.add(employee)
        await db.flush()
        return employee

    @staticmethod
    async def create_payroll(
        db: AsyncSession, employee_id: int, client_id: int, **kwargs
    ) -> PayrollMaster:
        payroll = PayrollMaster(
            employee_id=employee_id, client_id=client_id, **kwargs
        )
        db.add(payroll)
        await db.flush()
        return payroll
