from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.timesheet import Timesheet, TimesheetEntry, TimesheetStatus


class TimesheetRepository:
    """
    Repository class for Timesheet and TimesheetEntry operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, timesheet_id: int) -> Timesheet | None:
        result = await db.execute(
            select(Timesheet).where(Timesheet.id == timesheet_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_document(
        db: AsyncSession, document_id: int
    ) -> Timesheet | None:
        result = await db.execute(
            select(Timesheet).where(Timesheet.document_id == document_id)
        )
        return result.scalars().first()

    @staticmethod
    async def create(
        db: AsyncSession,
        client_id: int,
        billing_year: int,
        billing_month: int,
        document_id: int | None = None,
    ) -> Timesheet:
        timesheet = Timesheet(
            client_id=client_id,
            billing_year=billing_year,
            billing_month=billing_month,
            document_id=document_id,
            status=TimesheetStatus.DRAFT,
        )
        db.add(timesheet)
        await db.flush()
        return timesheet

    @staticmethod
    async def create_entry(
        db: AsyncSession, timesheet_id: int, **kwargs
    ) -> TimesheetEntry:
        entry = TimesheetEntry(timesheet_id=timesheet_id, **kwargs)
        db.add(entry)
        await db.flush()
        return entry

    @staticmethod
    async def get_entries(
        db: AsyncSession, timesheet_id: int
    ) -> list[TimesheetEntry]:
        result = await db.execute(
            select(TimesheetEntry).where(
                TimesheetEntry.timesheet_id == timesheet_id
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_status(
        db: AsyncSession, timesheet_id: int, status: TimesheetStatus
    ) -> Timesheet | None:
        ts = await TimesheetRepository.get_by_id(db, timesheet_id)
        if ts:
            ts.status = status
            db.add(ts)
            await db.flush()
        return ts
        