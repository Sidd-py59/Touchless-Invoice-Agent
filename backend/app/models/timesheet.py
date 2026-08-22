import enum
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.document import Document
    from app.models.employee import Employee
    from app.models.invoice import Invoice
    from app.models.validation import ValidationResult


class TimesheetStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    VALIDATION_PENDING = "validation_pending"
    VALIDATED = "validated"
    APPROVED = "approved"
    INVOICED = "invoiced"


class Timesheet(Base, TimestampMixin):
    """
    Normalized Timesheet Business Data.
    Aggregates attendance entries parsed for a client for a specific billing month.
    """

    __tablename__ = "timesheets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Not unique: a mixed payroll file spanning several clients produces one
    # timesheet per client from the same source document.
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    billing_year: Mapped[int] = mapped_column(
        Integer, index=True, nullable=False
    )
    billing_month: Mapped[int] = mapped_column(
        Integer, index=True, nullable=False
    )
    status: Mapped[TimesheetStatus] = mapped_column(
        Enum(TimesheetStatus, native_enum=False),
        default=TimesheetStatus.DRAFT,
        nullable=False,
    )

    # Relationships
    document: Mapped["Document | None"] = relationship(back_populates="timesheets")
    client: Mapped["Client"] = relationship(back_populates="timesheets")
    entries: Mapped[list["TimesheetEntry"]] = relationship(
        back_populates="timesheet", cascade="all, delete-orphan"
    )
    invoice: Mapped["Invoice | None"] = relationship(
        back_populates="timesheet", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Timesheet id={self.id} client_id={self.client_id} billing={self.billing_year}-{self.billing_month:02d} status={self.status}>"


class TimesheetEntry(Base, TimestampMixin):
    """
    Normalized Timesheet Entry.
    Holds the working, overtime, and leave details for a single employee.
    If employee_id cannot be resolved in Employee Master Data, employee_id is null
    and raw fields are stored for validation/human resolution.
    """

    __tablename__ = "timesheet_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timesheet_id: Mapped[int] = mapped_column(
        ForeignKey("timesheets.id", ondelete="CASCADE"), index=True, nullable=False
    )
    employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), index=True, nullable=True
    )
    raw_employee_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    raw_employee_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    working_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    ot_hours: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False, default=Decimal("0.00")
    )
    leave_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.00")
    )
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Per-period salary overrides from source file (null = use payroll master instead)
    salary_basic: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary_allowance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary_deduction: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary_ot_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Relationships
    timesheet: Mapped["Timesheet"] = relationship(back_populates="entries")
    employee: Mapped["Employee | None"] = relationship(
        back_populates="timesheet_entries"
    )
    validation_results: Mapped[list["ValidationResult"]] = relationship(
        back_populates="timesheet_entry", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TimesheetEntry id={self.id} timesheet_id={self.timesheet_id} employee_id={self.employee_id}>"
