import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Enum, ForeignKey, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.timesheet import Timesheet


class DocumentSource(str, enum.Enum):
    EXCEL = "excel"
    PDF = "pdf"
    IMAGE = "image"
    EMAIL = "email"
    PORTAL = "portal"
    HANDWRITTEN = "handwritten"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PARSED = "parsed"
    FAILED = "failed"


class Document(Base, TimestampMixin):
    """
    Raw Documents Layer.
    Stores metadata and path references to uploaded attendance/timesheet files.
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source: Mapped[DocumentSource] = mapped_column(
        Enum(DocumentSource, native_enum=False), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, native_enum=False),
        default=DocumentStatus.UPLOADED,
        nullable=False,
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="documents")
    extractions: Mapped[list["DocumentExtraction"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    timesheets: Mapped[list["Timesheet"]] = relationship(
        back_populates="document"
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} client_id={self.client_id} status={self.status}>"


class DocumentExtraction(Base, TimestampMixin):
    """
    Extraction Layer.
    Stores raw fields, coordinates (bbox), or cell locations extracted by the parser/OCR.
    Confidence is 1.0 for digital parses (e.g. openpyxl) and variable for OCR.
    """

    __tablename__ = "document_extractions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    field_name: Mapped[str] = mapped_column(
        String(100), index=True, nullable=False
    )
    field_value: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bbox: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON-serialized bounding box coordinates if using OCR
    row_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g., "openpyxl_parser_v1", "paddleocr_v2"

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="extractions")

    def __repr__(self) -> str:
        return f"<DocumentExtraction id={self.id} field={self.field_name} row={self.row_number} col={self.column_name} entity={self.entity_type} confidence={self.confidence}>"
