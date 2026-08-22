from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client


class ClientConfig(Base, TimestampMixin):
    """
    Client Configuration.
    Stores customizable terms, currency, service fees, taxes, and validation thresholds per client.
    """

    __tablename__ = "client_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    currency: Mapped[str] = mapped_column(String(10), default="AED", nullable=False)
    service_charge_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    tax_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    max_working_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("30.00"), nullable=False
    )
    max_ot_hours: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), default=Decimal("60.00"), nullable=False
    )
    invoice_prefix: Mapped[str] = mapped_column(
        String(10), default="INV", nullable=False
    )
    dispatch_method: Mapped[str] = mapped_column(
        String(50), default="EMAIL", nullable=False
    )  # e.g., "EMAIL", "PORTAL"
    validation_profile: Mapped[str] = mapped_column(
        String(50), default="DEFAULT", nullable=False
    )  # e.g., "STRICT", "DEFAULT"

    # Invoice appearance & terms
    brand_color: Mapped[str] = mapped_column(String(20), default="#1a56db", nullable=False)
    payment_terms_days: Mapped[int] = mapped_column(default=30, nullable=False)
    invoice_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="config")

    def __repr__(self) -> str:
        return f"<ClientConfig id={self.id} client_id={self.client_id} service_charge={self.service_charge_percentage}%>"
