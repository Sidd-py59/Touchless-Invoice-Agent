from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_upload
from app.db.session import get_db
from app.models.client import Client
from app.models.document import Document, DocumentStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.query import ClientQuery, QueryStatus
from app.schemas.finance import (
    PortalDocumentItem,
    PortalInvoiceListItem,
    PortalOverview,
    QueryCreate,
    QueryListItem,
    QueryListResponse,
)
from app.extractors.types import ExtractionError
from app.schemas.ingestion import IngestionResponse
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/portal", tags=["client-portal"])

UPLOAD_ROOT = Path("storage/uploads")


def _safe_filename(filename: str) -> str:
    name = Path(filename).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return name or "upload"


async def _get_client_or_404(client_id: int, db: AsyncSession) -> Client:
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/{client_id}/overview", response_model=PortalOverview)
async def portal_overview(client_id: int, db: AsyncSession = Depends(get_db)):
    client = await _get_client_or_404(client_id, db)

    total_invoices = (
        await db.execute(
            select(func.count()).select_from(Invoice).where(Invoice.client_id == client_id)
        )
    ).scalar_one()

    outstanding_row = (
        await db.execute(
            select(func.sum(Invoice.grand_total))
            .where(Invoice.client_id == client_id, Invoice.status == InvoiceStatus.SENT)
        )
    ).scalar_one()

    pending_docs = (
        await db.execute(
            select(func.count())
            .select_from(Document)
            .where(Document.client_id == client_id, Document.status == DocumentStatus.PROCESSING)
        )
    ).scalar_one()

    last_doc_row = (
        await db.execute(
            select(Document.uploaded_at)
            .where(Document.client_id == client_id)
            .order_by(Document.uploaded_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    return PortalOverview(
        client_id=client_id,
        client_name=client.name,
        total_invoices=total_invoices,
        outstanding_amount=outstanding_row or 0,
        last_upload_at=last_doc_row,
        pending_documents=pending_docs,
    )


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

@router.get("/{client_id}/invoices")
async def portal_invoices(
    client_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, db)

    from app.models.timesheet import Timesheet

    stmt = (
        select(Invoice, Timesheet.billing_year, Timesheet.billing_month)
        .join(Timesheet, Invoice.timesheet_id == Timesheet.id)
        .where(Invoice.client_id == client_id)
        .order_by(Invoice.generated_at.desc())
    )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    items = [
        PortalInvoiceListItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            billing_period=f"{billing_year}-{billing_month:02d}",
            grand_total=inv.grand_total,
            currency=inv.currency,
            status=inv.status.value,
            generated_at=inv.generated_at,
            has_pdf=bool(inv.invoice_pdf_path),
        )
        for inv, billing_year, billing_month in rows
    ]

    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/{client_id}/invoices/{invoice_id}/download")
async def portal_download_invoice(client_id: int, invoice_id: int, db: AsyncSession = Depends(get_db)):
    await _get_client_or_404(client_id, db)

    inv = (
        await db.execute(
            select(Invoice).where(Invoice.id == invoice_id, Invoice.client_id == client_id)
        )
    ).scalar_one_or_none()

    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not inv.invoice_pdf_path:
        raise HTTPException(status_code=404, detail="Invoice file not yet generated")

    path = Path(inv.invoice_pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Invoice file missing from disk")

    media_type = "application/pdf" if path.suffix == ".pdf" else "text/html"
    return FileResponse(path=str(path), media_type=media_type, filename=path.name)


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@router.get("/{client_id}/documents")
async def portal_documents(
    client_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, db)

    stmt = (
        select(Document)
        .where(Document.client_id == client_id)
        .order_by(Document.uploaded_at.desc())
    )

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    docs = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).scalars().all()

    items = [
        PortalDocumentItem(
            id=doc.id,
            file_name=doc.file_name,
            source=doc.source.value,
            status=doc.status.value,
            uploaded_at=doc.uploaded_at,
        )
        for doc in docs
    ]

    return {"total": total, "page": page, "page_size": page_size, "items": items}


# ---------------------------------------------------------------------------
# Upload (client submits their own timesheet)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

@router.post("/{client_id}/queries", status_code=201)
async def submit_query(client_id: int, body: QueryCreate, db: AsyncSession = Depends(get_db)):
    await _get_client_or_404(client_id, db)
    query = ClientQuery(
        client_id=client_id,
        invoice_id=body.invoice_id,
        subject=body.subject,
        body=body.body,
    )
    db.add(query)
    await db.commit()
    await db.refresh(query)
    return {"id": query.id, "status": query.status.value, "message": "Query submitted successfully"}


@router.get("/{client_id}/queries", response_model=QueryListResponse)
async def list_client_queries(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    client = await _get_client_or_404(client_id, db)
    rows = (await db.execute(
        select(ClientQuery)
        .where(ClientQuery.client_id == client_id)
        .order_by(ClientQuery.created_at.desc())
    )).scalars().all()

    items = [
        QueryListItem(
            id=q.id,
            client_id=q.client_id,
            client_name=client.name,
            invoice_id=q.invoice_id,
            subject=q.subject,
            body=q.body,
            status=q.status.value,
            resolution_note=q.resolution_note,
            resolved_by=q.resolved_by,
            created_at=q.created_at,
        )
        for q in rows
    ]
    return QueryListResponse(total=len(items), items=items)


# ---------------------------------------------------------------------------
# Upload (client submits their own timesheet)
# ---------------------------------------------------------------------------

@router.post("/{client_id}/upload", response_model=IngestionResponse)
async def portal_upload(
    client_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, db)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    validate_upload(file.filename, contents)

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_filename(file.filename or "upload")
    saved_path = UPLOAD_ROOT / f"{uuid4().hex}_{safe_name}"
    saved_path.write_bytes(contents)

    service = IngestionService(db)
    try:
        return await service.ingest_file(
            path=saved_path,
            file_name=file.filename or saved_path.name,
            mime_type=file.content_type,
            client_id=client_id,
        )
    except (ExtractionError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Database write failed. Ensure the configured database is migrated to the canonical TIA schema.",
        ) from exc
