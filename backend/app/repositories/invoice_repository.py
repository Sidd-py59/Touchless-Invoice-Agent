from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus


class InvoiceRepository:
    """
    Repository class for Invoice and InvoiceItem operations.
    Holds single-responsibility database queries.
    """

    @staticmethod
    async def get_by_id(db: AsyncSession, invoice_id: int) -> Invoice | None:
        result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
        return result.scalars().first()

    @staticmethod
    async def get_by_number(
        db: AsyncSession, invoice_number: str
    ) -> Invoice | None:
        result = await db.execute(
            select(Invoice).where(Invoice.invoice_number == invoice_number)
        )
        return result.scalars().first()

    @staticmethod
    async def get_by_timesheet(
        db: AsyncSession, timesheet_id: int
    ) -> Invoice | None:
        result = await db.execute(
            select(Invoice).where(Invoice.timesheet_id == timesheet_id)
        )
        return result.scalars().first()

    @staticmethod
    async def create(db: AsyncSession, **kwargs) -> Invoice:
        invoice = Invoice(status=InvoiceStatus.DRAFT, **kwargs)
        db.add(invoice)
        await db.flush()
        return invoice

    @staticmethod
    async def create_item(db: AsyncSession, invoice_id: int, **kwargs) -> InvoiceItem:
        item = InvoiceItem(invoice_id=invoice_id, **kwargs)
        db.add(item)
        await db.flush()
        return item

    @staticmethod
    async def update_status(
        db: AsyncSession, invoice_id: int, status: InvoiceStatus
    ) -> Invoice | None:
        invoice = await InvoiceRepository.get_by_id(db, invoice_id)
        if invoice:
            invoice.status = status
            db.add(invoice)
            await db.flush()
        return invoice
