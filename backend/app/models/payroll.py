from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.employee import Employee


class PayrollMaster(Base, TimestampMixin):
    """
    Payroll Master Data.
    Stores the contractual billing rates, salary terms, and extra charges
    for an employee's assignment at a client site.
    """

    __tablename__ = "payroll_master"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    basic_salary: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    ot_rate_per_hour: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    allowance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    deduction: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    currency: Mapped[str] = mapped_column(
        String(10), default="AED", nullable=False
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(back_populates="payroll_records")
    client: Mapped["Client"] = relationship()

    def __repr__(self) -> str:
        return f"<PayrollMaster id={self.id} employee_id={self.employee_id} basic={self.basic_salary}>"
