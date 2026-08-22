from decimal import Decimal
from pydantic import BaseModel


class EmployeeRecord(BaseModel):
    """
    Unified representation of a single employee's parsed attendance metrics
    returned by any document parser.
    """

    employee_code: str | None = None
    employee_name: str | None = None
    working_days: Decimal = Decimal("0.00")
    ot_hours: Decimal = Decimal("0.00")
    leave_days: Decimal = Decimal("0.00")
    remarks: str | None = None
    confidence: float = 1.0

    # Optional salary overrides — populated when the source file contains
    # explicit per-period salary figures (e.g. a payroll Excel with Basic/Gross columns).
    # When present, invoice generation uses these instead of the DB payroll master.
    salary_basic: Decimal | None = None
    salary_allowance: Decimal | None = None
    salary_deduction: Decimal | None = None
    salary_ot_amount: Decimal | None = None
