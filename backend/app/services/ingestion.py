from __future__ import annotations

import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client
from app.models.document import Document, DocumentExtraction, DocumentStatus, DocumentSource
from app.models.timesheet import Timesheet, TimesheetEntry, TimesheetStatus
from app.document_intelligence import DocumentIntelligenceService
from app.business_intelligence import NormalizationService
from app.business_intelligence.validators import ValidationService
from app.finance_automation.invoice_creator import InvoiceService


class IngestionService:
    """
    Ingestion Service Adapter.
    Bridges the existing API endpoints and schemas (Layer 4) with the newly
    refactored Layer 1 (Document Intelligence) and Layer 2 (Business Intelligence) modules.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.intelligence_service = DocumentIntelligenceService()

    async def ingest_file(
        self,
        *,
        path: Path,
        file_name: str,
        mime_type: str | None,
        client_id: int | None = None,
        handwritten: bool = False,
        scanned: bool = False,
    ) -> dict[str, Any]:
        # 1. Read input bytes
        contents = path.read_bytes()

        # 2. Run Layer 1 (Document Intelligence Parsing)
        dto = await self.intelligence_service.ingest_document(
            file_content=contents,
            file_name=file_name,
            mime_type=mime_type or "application/octet-stream",
            handwritten=handwritten,
            scanned=scanned,
        )

        # 3. Resolve client_id dynamically from DTO if not provided
        resolved_client_id = await self._resolve_client_id(
            client_id=client_id,
            client_name=dto.metadata.client_name,
            client_code=dto.metadata.client_code
        )

        # 4. Create Document entry
        try:
            db_source = DocumentSource(dto.metadata.source)
        except ValueError:
            db_source = DocumentSource.EXCEL

        document = Document(
            client_id=resolved_client_id,
            source=db_source,
            file_name=file_name,
            file_path=str(path),
            mime_type=mime_type or "application/octet-stream",
            status=DocumentStatus.PROCESSING,
        )
        self.session.add(document)
        await self.session.flush()

        # 5. Run Layer 2 Ingestion (Normalization -> Validation)
        # A mixed file spanning several clients yields one timesheet per client.
        timesheets = await NormalizationService.normalize(self.session, document.id, dto)
        timesheets = [
            await ValidationService.validate_timesheet(self.session, ts.id)
            for ts in timesheets
        ]

        # 6. Touchless automation: invoice + approve + send every cleanly
        # validated timesheet. Ones with errors stay in the review queue.
        auto_invoices = await self._auto_process_timesheets(timesheets)

        # Load generated canonical entries and extractions from DB to serialize
        entries = []
        for ts in timesheets:
            entries.extend(await self._load_entries(ts.id))
        extractions = await self._load_extractions(document.id)

        await self.session.commit()

        # Return standardized response payload matching the original ingestion structure
        source_hash = self._hash_file(path)
        return self._build_response_payload(
            document=document,
            dto=dto,
            timesheets=timesheets,
            entries=entries,
            extractions=extractions,
            source_hash=source_hash,
            auto_invoices=auto_invoices,
        )

    async def ingest_email_body(
        self,
        *,
        body: str,
        subject: str | None = None,
        client_id: int | None = None,
    ) -> dict[str, Any]:
        # 1. Ingest email body as text
        body_bytes = body.encode("utf-8")
        dto = await self.intelligence_service.ingest_document(
            file_content=body_bytes,
            file_name="email.eml",
            mime_type="message/rfc822"
        )

        # Update metadata details
        dto.metadata.file_name = subject or "email_body"
        dto.metadata.raw_text = body

        # 2. Resolve client_id
        resolved_client_id = await self._resolve_client_id(
            client_id=client_id,
            client_name=dto.metadata.client_name,
            client_code=dto.metadata.client_code
        )

        # 3. Create Document
        document = Document(
            client_id=resolved_client_id,
            source=DocumentSource.EMAIL,
            file_name=subject or "email_body",
            file_path="email://body",
            mime_type="text/plain",
            status=DocumentStatus.PROCESSING,
        )
        self.session.add(document)
        await self.session.flush()

        # 4. Run Layer 2 Ingestion (Normalization -> Validation)
        # A mixed email spanning several clients yields one timesheet per client.
        timesheets = await NormalizationService.normalize(self.session, document.id, dto)
        timesheets = [
            await ValidationService.validate_timesheet(self.session, ts.id)
            for ts in timesheets
        ]

        # 5. Touchless automation: invoice + approve + send every cleanly
        # validated timesheet. Ones with errors stay in the review queue.
        auto_invoices = await self._auto_process_timesheets(timesheets)

        # Load records to serialize
        entries = []
        for ts in timesheets:
            entries.extend(await self._load_entries(ts.id))
        extractions = await self._load_extractions(document.id)

        await self.session.commit()

        source_hash = self._hash_text(body)
        return self._build_response_payload(
            document=document,
            dto=dto,
            timesheets=timesheets,
            entries=entries,
            extractions=extractions,
            source_hash=source_hash,
            auto_invoices=auto_invoices,
        )

    # Legal-form suffixes ignored when comparing company names, so that e.g.
    # "Emirates Steel Industries" in a payroll file routes to the existing
    # "Emirates Steel Industries LLC" client instead of creating a duplicate.
    _LEGAL_SUFFIXES = {"llc", "pjsc", "fze", "psc", "ltd", "limited", "inc", "co", "corp", "corporation", "company"}

    @classmethod
    def _normalize_company_name(cls, name: str) -> str:
        tokens = re.findall(r"[a-z0-9]+", name.lower())
        while tokens and tokens[-1] in cls._LEGAL_SUFFIXES:
            tokens.pop()
        return "".join(tokens)

    async def _match_client_by_name(self, client_name: str) -> Client | None:
        """Loose company-name match: case/punctuation/legal-suffix insensitive,
        falling back to unambiguous containment ("Emirates Steel" -> "Emirates
        Steel Industries LLC"). Returns None when no safe match exists."""
        target = self._normalize_company_name(client_name)
        if len(target) < 4:
            return None

        result = await self.session.execute(select(Client).where(Client.is_active.is_(True)))
        clients = list(result.scalars().all())

        exact = [c for c in clients if self._normalize_company_name(c.name) == target]
        if exact:
            return exact[0]

        contained = [
            c
            for c in clients
            if (norm := self._normalize_company_name(c.name)) and len(norm) >= 4
            and (target in norm or norm in target)
        ]
        if len(contained) == 1:
            return contained[0]
        return None

    async def _resolve_client_id(
        self, client_id: int | None, client_name: str | None, client_code: str | None
    ) -> int:
        if client_id is not None:
            return client_id

        name = client_name or (
            f"Imported Client {client_code}"
            if client_code
            else "Unassigned Ingestion Client"
        )

        statement = select(Client).where(func.lower(Client.name) == func.lower(name))
        result = await self.session.execute(statement)
        client = result.scalar_one_or_none()

        if client is None and client_name:
            client = await self._match_client_by_name(client_name)

        if client is None:
            client = Client(name=name, is_active=True)
            self.session.add(client)
            await self.session.flush()
        return client.id

    async def _auto_process_timesheets(
        self, timesheets: list[Timesheet]
    ) -> list[dict[str, Any]]:
        """
        Full automation after parsing/validation for every ingestion source
        (portal upload, admin upload, Gmail, email body): generate, approve,
        and send the invoice for each timesheet that validated cleanly. Any
        timesheet with unresolved errors is skipped for human review.
        """
        if not settings.AUTO_INVOICE:
            return []
        return [
            await InvoiceService.auto_process(self.session, ts.id)
            for ts in timesheets
        ]

    async def _load_entries(self, timesheet_id: int) -> list[TimesheetEntry]:
        statement = (
            select(TimesheetEntry)
            .where(TimesheetEntry.timesheet_id == timesheet_id)
            .order_by(TimesheetEntry.id)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def _load_extractions(self, document_id: int) -> list[DocumentExtraction]:
        statement = (
            select(DocumentExtraction)
            .where(DocumentExtraction.document_id == document_id)
            .order_by(DocumentExtraction.id)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    def _build_response_payload(
        self,
        *,
        document: Document,
        dto: Any,
        timesheets: list[Timesheet],
        entries: list[TimesheetEntry],
        extractions: list[DocumentExtraction],
        source_hash: str,
        auto_invoices: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        primary_timesheet = timesheets[0]
        # Form list of list values for extracted table representation
        rows = []
        for emp in dto.employees:
            rows.append([
                emp.employee_code,
                emp.employee_name,
                float(emp.working_days),
                float(emp.ot_hours),
                float(emp.leave_days),
                emp.remarks
            ])

        headers = [
            "employee code",
            "employee name",
            "working days",
            "ot hours",
            "leave days",
            "remarks"
        ]

        needs_review = any(
            ts.status == TimesheetStatus.VALIDATION_PENDING for ts in timesheets
        )

        extracted_table = {
            "headers": headers,
            "rows": rows,
            "confidence": dto.metadata.confidence,
            "document_source": dto.metadata.source,
            "parser_name": dto.metadata.parser,
            "metadata": {
                "billing_month": dto.metadata.billing_month,
                "client_name": dto.metadata.client_name,
                "client_code": dto.metadata.client_code,
            },
            "warnings": dto.metadata.warnings,
            "verified_by_ai": False,
            "needs_review": needs_review,
        }

        return {
            "document_id": document.id,
            "document_extraction_count": len(extractions),
            "timesheet_id": primary_timesheet.id,
            "timesheet_ids": [ts.id for ts in timesheets],
            "document_source": document.source.value,
            "status": document.status.value,
            "parser_name": dto.metadata.parser,
            "confidence": dto.metadata.confidence,
            "needs_review": needs_review,
            "source_hash": source_hash,
            "invoices": auto_invoices or [],
            "extracted_table": extracted_table,
            "canonical_sql": {
                "tables": {
                    "documents": [self._serialize_document(document)],
                    "document_extractions": [
                        self._serialize_extraction(e) for e in extractions
                    ],
                    "timesheets": [
                        self._serialize_timesheet(ts) for ts in timesheets
                    ],
                    "timesheet_entries": [
                        self._serialize_entry(entry) for entry in entries
                    ],
                }
            },
        }

    @staticmethod
    def _serialize_document(document: Document) -> dict[str, Any]:
        return {
            "id": document.id,
            "client_id": document.client_id,
            "source": document.source.value,
            "file_name": document.file_name,
            "file_path": document.file_path,
            "mime_type": document.mime_type,
            "status": document.status.value,
            "uploaded_at": (
                document.uploaded_at.isoformat() if document.uploaded_at else None
            ),
        }

    @staticmethod
    def _serialize_extraction(extraction: DocumentExtraction) -> dict[str, Any]:
        return {
            "id": extraction.id,
            "document_id": extraction.document_id,
            "field_name": extraction.field_name,
            "field_value": extraction.field_value,
            "confidence": extraction.confidence,
            "page": extraction.page,
            "bbox": extraction.bbox,
            "source": extraction.source,
        }

    @staticmethod
    def _serialize_timesheet(timesheet: Timesheet) -> dict[str, Any]:
        # Present billing period as YYYY-MM string for parity
        billing_str = f"{timesheet.billing_year:04d}-{timesheet.billing_month:02d}"
        return {
            "id": timesheet.id,
            "document_id": timesheet.document_id,
            "client_id": timesheet.client_id,
            "billing_month": billing_str,
            "status": timesheet.status.value,
        }

    @staticmethod
    def _serialize_entry(entry: TimesheetEntry) -> dict[str, Any]:
        return {
            "id": entry.id,
            "timesheet_id": entry.timesheet_id,
            "employee_id": entry.employee_id,
            "raw_employee_code": entry.raw_employee_code,
            "raw_employee_name": entry.raw_employee_name,
            "working_days": float(entry.working_days),
            "ot_hours": float(entry.ot_hours),
            "leave_days": float(entry.leave_days),
            "remarks": entry.remarks,
            "remarks_payload": IngestionService._json_or_none(entry.remarks),
            "confidence": entry.confidence,
        }

    @staticmethod
    def _json_or_none(value: str | None) -> Any:
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    @staticmethod
    def _hash_file(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _hash_text(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()
