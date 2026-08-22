from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document, DocumentExtraction, DocumentSource, DocumentStatus
from app.models.job import JobStage, JobStatus, ProcessingJob


class DocumentRepository:
    """
    Repository class for Document, DocumentExtraction, and ProcessingJob operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, document_id: int) -> Document | None:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalars().first()

    @staticmethod
    async def create(
        db: AsyncSession,
        client_id: int,
        source: DocumentSource,
        file_name: str,
        file_path: str,
        mime_type: str,
    ) -> Document:
        doc = Document(
            client_id=client_id,
            source=source,
            file_name=file_name,
            file_path=file_path,
            mime_type=mime_type,
            status=DocumentStatus.UPLOADED,
        )
        db.add(doc)
        await db.flush()
        return doc

    @staticmethod
    async def update_status(
        db: AsyncSession, document_id: int, status: DocumentStatus
    ) -> Document | None:
        doc = await DocumentRepository.get_by_id(db, document_id)
        if doc:
            doc.status = status
            db.add(doc)
            await db.flush()
        return doc

    @staticmethod
    async def create_extraction(
        db: AsyncSession, document_id: int, **kwargs
    ) -> DocumentExtraction:
        extraction = DocumentExtraction(document_id=document_id, **kwargs)
        db.add(extraction)
        await db.flush()
        return extraction

    # Job Management Queries
    @staticmethod
    async def create_job(
        db: AsyncSession, document_id: int, stage: JobStage
    ) -> ProcessingJob:
        job = ProcessingJob(
            document_id=document_id, stage=stage, status=JobStatus.PENDING
        )
        db.add(job)
        await db.flush()
        return job

    @staticmethod
    async def update_job(
        db: AsyncSession,
        job_id: int,
        status: JobStatus,
        error_message: str | None = None,
    ) -> ProcessingJob | None:
        result = await db.execute(select(ProcessingJob).where(ProcessingJob.id == job_id))
        job = result.scalars().first()
        if job:
            job.status = status
            if status == JobStatus.RUNNING:
                job.started_at = datetime.utcnow()
            elif status in (JobStatus.COMPLETED, JobStatus.FAILED):
                job.finished_at = datetime.utcnow()
            if error_message:
                job.error_message = error_message
                job.retry_count += 1
            db.add(job)
            await db.flush()
        return job
