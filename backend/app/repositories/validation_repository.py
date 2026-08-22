from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.validation import ValidationResult, ValidationStatus


class ValidationRepository:
    """
    Repository class for ValidationResult operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, result_id: int) -> ValidationResult | None:
        result = await db.execute(
            select(ValidationResult).where(ValidationResult.id == result_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_entry(
        db: AsyncSession, timesheet_entry_id: int
    ) -> list[ValidationResult]:
        result = await db.execute(
            select(ValidationResult).where(
                ValidationResult.timesheet_entry_id == timesheet_entry_id
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> ValidationResult:
        result = ValidationResult(**kwargs)
        db.add(result)
        await db.flush()
        return result

    @staticmethod
    async def resolve_result(
        db: AsyncSession, result_id: int, resolved_by: str
    ) -> ValidationResult | None:
        res = await ValidationRepository.get_by_id(db, result_id)
        if res:
            res.resolved = True
            res.resolved_by = resolved_by
            res.status = ValidationStatus.PASSED  # Mark as passed when manually resolved
            db.add(res)
            await db.flush()
        return res
