from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_upload
from app.db.session import get_db
from app.extractors.types import ExtractionError
from app.schemas.ingestion import EmailIngestionRequest, IngestionResponse
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/ingestion", tags=["ingestion"])
UPLOAD_ROOT = Path("storage/uploads")


@router.post("/upload", response_model=IngestionResponse)
async def ingest_upload(
    file: UploadFile = File(...),
    client_id: int | None = Form(default=None),
    handwritten: bool = Form(default=False),
    scanned: bool = Form(default=False),
    db: AsyncSession = Depends(get_db),
) -> dict:
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    validate_upload(file.filename, contents)

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_filename(file.filename or "upload")
    saved_path = UPLOAD_ROOT / f"{uuid4().hex}_{safe_name}"
    saved_path.write_bytes(contents)

    if client_id == 0:
        client_id = None

    service = IngestionService(db)
    try:
        return await service.ingest_file(
            path=saved_path,
            file_name=file.filename or saved_path.name,
            mime_type=file.content_type,
            client_id=client_id,
            handwritten=handwritten,
            scanned=scanned,
        )
    except (ExtractionError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Database write failed. Ensure the configured database is migrated to the canonical TIA schema.",
        ) from exc


@router.post("/email", response_model=IngestionResponse)
async def ingest_email(
    payload: EmailIngestionRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    if payload.client_id == 0:
        payload.client_id = None

    service = IngestionService(db)
    try:
        return await service.ingest_email_body(
            body=payload.body,
            subject=payload.subject,
            client_id=payload.client_id,
        )
    except (ExtractionError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Database write failed. Ensure the configured database is migrated to the canonical TIA schema.",
        ) from exc


def _safe_filename(filename: str) -> str:
    name = Path(filename).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return name or "upload"



