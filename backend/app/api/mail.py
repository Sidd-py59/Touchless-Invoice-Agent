from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.mail import GmailSyncRequest, GmailSyncResponse
from app.services.gmail_ingestion import GmailApiError, GmailIngestionService

router = APIRouter(prefix="/mail", tags=["mail-ingestion"])


@router.post("/gmail/sync", response_model=GmailSyncResponse)
async def sync_gmail(
    payload: GmailSyncRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = payload or GmailSyncRequest()
    try:
        return await GmailIngestionService(db).sync(
            from_email=payload.from_email,
            to_email=payload.to_email,
            max_results=payload.max_results,
            client_id=payload.client_id,
            include_processed=payload.include_processed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GmailApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc