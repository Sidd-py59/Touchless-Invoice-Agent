from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.payroll import PayrollMaster
    from app.models.timesheet import TimesheetEntry
    from app.models.invoice import InvoiceItem


class Employee(Base, TimestampMixin):
    """
    Employee Master Data.
    TASC employees deployed at client sites.
    """

    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    employee_code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="employees")
    payroll_records: Mapped[list["PayrollMaster"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
    timesheet_entries: Mapped[list["TimesheetEntry"]] = relationship(
        back_populates="employee"
    )
    invoice_items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="employee"
    )

    def __repr__(self) -> str:
        return f"<Employee id={self.id} code={self.employee_code} name={self.first_name} {self.last_name}>"
