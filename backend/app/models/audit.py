from datetime import datetime
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base


class AuditLog(Base):
    """
    Audit Logs Layer.
    Logs all operations (inserts, updates, deletes, validations) on crucial business data.
    """

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    entity: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # e.g., "timesheets", "invoices", "employees"
    entity_id: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # Polymorphic key (id converted to string)
    action: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # e.g., "create", "update", "delete", "resolve_validation"
    old_value: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON dump of before state
    new_value: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON dump of after state
    performed_by: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Identity of the system agent or user
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} entity={self.entity} action={self.action} performed_by={self.performed_by}>"
