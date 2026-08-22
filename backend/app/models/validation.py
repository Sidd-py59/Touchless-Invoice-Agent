import enum
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.timesheet import TimesheetEntry


class ValidationSeverity(str, enum.Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationStatus(str, enum.Enum):
    FAILED = "failed"
    PASSED = "passed"


class ValidationResult(Base, TimestampMixin):
    """
    Validation Layer.
    Stores the output of rules run against timesheet entries.
    Flags data issues (Duplicate Employee, Inactive Employee, Client Mismatch, etc.)
    """

    __tablename__ = "validation_results"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    timesheet_entry_id: Mapped[int] = mapped_column(
        ForeignKey("timesheet_entries.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rule_name: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False
    )  # e.g. "Duplicate Employee", "Inactive Employee"
    status: Mapped[ValidationStatus] = mapped_column(
        Enum(ValidationStatus, native_enum=False), nullable=False
    )
    severity: Mapped[ValidationSeverity] = mapped_column(
        Enum(ValidationSeverity, native_enum=False), nullable=False
    )
    expected: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Expected values (JSON string or text)
    actual: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Actual values parsed (JSON string or text)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    resolved_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # User or mechanism that resolved this issue

    # Relationships
    timesheet_entry: Mapped["TimesheetEntry"] = relationship(
        back_populates="validation_results"
    )

    def __repr__(self) -> str:
        return f"<ValidationResult id={self.id} rule_name={self.rule_name} status={self.status}>"
