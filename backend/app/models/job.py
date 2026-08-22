import enum
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.document import Document


class JobStage(str, enum.Enum):
    UPLOAD = "UPLOAD"
    OCR = "OCR"
    PARSER = "PARSER"
    NORMALIZER = "NORMALIZER"
    VALIDATION = "VALIDATION"
    INVOICE = "INVOICE"
    DISPATCH = "DISPATCH"


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProcessingJob(Base, TimestampMixin):
    """
    Processing Jobs.
    Tracks asynchronous execution steps (stages) and execution state for documents.
    """

    __tablename__ = "processing_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    stage: Mapped[JobStage] = mapped_column(
        Enum(JobStage, native_enum=False), nullable=False
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False), default=JobStatus.PENDING, nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    worker_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    document: Mapped["Document"] = relationship()

    def __repr__(self) -> str:
        return f"<ProcessingJob id={self.id} document_id={self.document_id} stage={self.stage} status={self.status}>"
