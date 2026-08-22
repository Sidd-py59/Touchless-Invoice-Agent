import enum
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.employee import Employee
    from app.models.timesheet import Timesheet


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    VOID = "void"


class InvoiceApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Invoice(Base, TimestampMixin):
    """
    Invoice Layer.
    Stores high-level billing aggregates computed from validated timesheets.
    """

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )  # e.g. INV-2026-0001
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    timesheet_id: Mapped[int] = mapped_column(
        ForeignKey("timesheets.id", ondelete="RESTRICT"),
        unique=True,
        index=True,
        nullable=False,
    )
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="AED", nullable=False)
    invoice_pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    service_charge: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    tax: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    grand_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, native_enum=False),
        default=InvoiceStatus.DRAFT,
        nullable=False,
    )
    approval_status: Mapped[InvoiceApprovalStatus] = mapped_column(
        Enum(InvoiceApprovalStatus, native_enum=False),
        default=InvoiceApprovalStatus.PENDING,
        nullable=False,
    )
    approved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="invoices")
    timesheet: Mapped["Timesheet"] = relationship(back_populates="invoice")
    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Invoice id={self.id} number={self.invoice_number} grand_total={self.grand_total}>"


class InvoiceItem(Base, TimestampMixin):
    """
    Invoice Item Details.
    Line-item detail breakdown for each employee's calculated billing.
    """

    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    invoice_id: Mapped[int] = mapped_column(
        ForeignKey("invoices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    gross_salary: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    ot_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    allowance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    deduction: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    bill_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="items")
    employee: Mapped["Employee"] = relationship(back_populates="invoice_items")

    def __repr__(self) -> str:
        return f"<InvoiceItem id={self.id} invoice_id={self.invoice_id} employee_id={self.employee_id} bill_amount={self.bill_amount}>"
