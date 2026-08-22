from typing import TYPE_CHECKING
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.document import Document
    from app.models.timesheet import Timesheet
    from app.models.invoice import Invoice
    from app.models.client_config import ClientConfig
    from app.models.query import ClientQuery


class Client(Base, TimestampMixin):
    """
    Client Master Data.
    Clients are the organizations hiring employees from TASC.
    """

    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    config: Mapped["ClientConfig"] = relationship(
        back_populates="client", uselist=False, cascade="all, delete-orphan"
    )
    employees: Mapped[list["Employee"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    timesheets: Mapped[list["Timesheet"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    queries: Mapped[list["ClientQuery"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Client id={self.id} name={self.name}>"
