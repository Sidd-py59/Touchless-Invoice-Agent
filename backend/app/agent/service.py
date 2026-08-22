from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.rag import DataInsightService
from app.agent.voice import SmallestVoiceService
from app.finance_automation.invoice_creator import InvoiceService
from app.models.client import Client
from app.models.document import Document, DocumentExtraction, DocumentStatus
from app.models.invoice import Invoice, InvoiceApprovalStatus, InvoiceStatus
from app.models.timesheet import Timesheet, TimesheetStatus
from app.models.validation import ValidationResult, ValidationStatus

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}


class FinanceAgentService:
    """Deterministic finance command agent for the touchless invoice workflow."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._voice = SmallestVoiceService()

    async def handle(self, text: str, voice_id: str | None = None) -> dict[str, Any]:
        original_text = text.strip()
        normalized = self._normalize(original_text)

        self._voice_id_override = voice_id

        if not normalized:
            return await self._response(
                "unknown",
                "needs_clarification",
                "I can answer pending invoices, timesheets needing review, failed extractions, client invoice status, or generate an invoice for a client.",
                {"examples": ["how many invoices are pending", "show finance overview"]},
            )

        intent = self._detect_intent(normalized)
        if intent == "pending_invoices":
            return await self._pending_invoices()
        if intent == "timesheets_need_review":
            return await self._timesheets_need_review()
        if intent == "failed_extractions":
            return await self._failed_extractions()
        if intent == "generate_invoice":
            return await self._generate_invoice(original_text, normalized)
        if intent == "client_invoice_status":
            return await self._client_invoice_status(original_text, normalized)
        if intent == "finance_overview":
            return await self._finance_overview()

        # Free-form question: answer from live database data (RAG).
        answered = await self._answer_from_data(original_text)
        if answered is not None:
            return answered

        return await self._response(
            "unknown",
            "needs_clarification",
            "I could not find an answer for that. Ask me about invoices, timesheets, "
            "clients, employees, payroll, or validation issues — for example, which "
            "client generated the most revenue this month.",
            {
                "examples": [
                    "how many invoices are pending",
                    "which client has the highest total billed amount",
                    "how many employees does Emirates Steel have",
                    "total overtime hours for June 2026",
                    "generate invoice for client CL001 for June 2026",
                ]
            },
        )

    async def _answer_from_data(self, question: str) -> dict[str, Any] | None:
        """Data-grounded fallback: plan a read-only query, answer from the rows."""
        try:
            result = await DataInsightService(self.db).answer(question)
        except Exception:
            return None
        if not result:
            return None
        return await self._response(
            "data_query",
            "success",
            result["message"],
            result["data"],
        )

    def _detect_intent(self, text: str) -> str:
        has_invoice = "invoice" in text or "invoices" in text
        has_timesheet = "timesheet" in text or "timesheets" in text or "payroll" in text

        if has_invoice and any(word in text for word in ("generate", "create", "make")):
            return "generate_invoice"
        if has_invoice and any(word in text for word in ("pending", "draft", "approval", "waiting")):
            return "pending_invoices"
        if has_invoice and any(word in text for word in ("status", "summary", "latest")):
            return "client_invoice_status"
        if has_timesheet and any(word in text for word in ("review", "validation", "pending", "issue", "error")):
            return "timesheets_need_review"
        if any(word in text for word in ("extraction", "ocr", "low confidence")) or (
            "document" in text and any(word in text for word in ("failed", "failure"))
        ):
            return "failed_extractions"
        if any(word in text for word in ("overview", "summary", "dashboard")):
            return "finance_overview"
        return "unknown"

    async def _pending_invoices(self) -> dict[str, Any]:
        pending_count = await self._count(
            select(func.count())
            .select_from(Invoice)
            .where(
                or_(
                    Invoice.status == InvoiceStatus.DRAFT,
                    Invoice.approval_status == InvoiceApprovalStatus.PENDING,
                )
            )
        )
        draft_count = await self._count(
            select(func.count()).select_from(Invoice).where(Invoice.status == InvoiceStatus.DRAFT)
        )
        approval_pending_count = await self._count(
            select(func.count())
            .select_from(Invoice)
            .where(Invoice.approval_status == InvoiceApprovalStatus.PENDING)
        )
        sent_count = await self._count(
            select(func.count()).select_from(Invoice).where(Invoice.status == InvoiceStatus.SENT)
        )
        paid_count = await self._count(
            select(func.count()).select_from(Invoice).where(Invoice.status == InvoiceStatus.PAID)
        )
        overdue_count = await self._count(
            select(func.count()).select_from(Invoice).where(Invoice.status == InvoiceStatus.OVERDUE)
        )

        message = (
            f"There are {pending_count} pending invoices. "
            f"{draft_count} are draft and {approval_pending_count} are awaiting approval."
        )
        return await self._response(
            "pending_invoices",
            "success",
            message,
            {
                "pending_invoice_count": pending_count,
                "draft_count": draft_count,
                "approval_pending_count": approval_pending_count,
                "sent_count": sent_count,
                "paid_count": paid_count,
                "overdue_count": overdue_count,
            },
        )

    async def _timesheets_need_review(self) -> dict[str, Any]:
        review_count = await self._count(
            select(func.count())
            .select_from(Timesheet)
            .where(Timesheet.status == TimesheetStatus.VALIDATION_PENDING)
        )
        unresolved_error_count = await self._count(
            select(func.count())
            .select_from(ValidationResult)
            .where(
                ValidationResult.status == ValidationStatus.FAILED,
                ValidationResult.resolved == False,
            )
        )
        message = (
            f"There are {review_count} timesheets needing review, "
            f"with {unresolved_error_count} unresolved validation errors."
        )
        return await self._response(
            "timesheets_need_review",
            "success",
            message,
            {
                "timesheets_need_review_count": review_count,
                "unresolved_validation_error_count": unresolved_error_count,
            },
        )

    async def _failed_extractions(self) -> dict[str, Any]:
        failed_document_count = await self._count(
            select(func.count())
            .select_from(Document)
            .where(Document.status == DocumentStatus.FAILED)
        )
        low_confidence_field_count = await self._count(
            select(func.count())
            .select_from(DocumentExtraction)
            .where(DocumentExtraction.confidence < 0.95)
        )
        low_confidence_document_count = await self._count(
            select(func.count(distinct(DocumentExtraction.document_id)))
            .select_from(DocumentExtraction)
            .where(DocumentExtraction.confidence < 0.95)
        )
        message = (
            f"There are {failed_document_count} failed documents and "
            f"{low_confidence_document_count} documents with low-confidence extraction fields."
        )
        return await self._response(
            "failed_extractions",
            "success",
            message,
            {
                "failed_document_count": failed_document_count,
                "low_confidence_document_count": low_confidence_document_count,
                "low_confidence_field_count": low_confidence_field_count,
                "confidence_threshold": 0.95,
            },
        )

    async def _generate_invoice(self, original_text: str, normalized: str) -> dict[str, Any]:
        client = await self._resolve_client(original_text, normalized)
        if client is None:
            return await self._response(
                "generate_invoice",
                "needs_clarification",
                "Tell me which client to generate the invoice for. You can say client id 1, CL001, or the client name.",
                {"required_field": "client"},
            )

        billing = self._extract_billing_period(normalized)
        timesheet = await self._find_timesheet_for_invoice(client.id, billing)
        if timesheet is None:
            period_text = self._billing_text(billing) if billing else "the latest billing period"
            blocked_timesheet = await self._find_latest_timesheet(client.id, billing)
            if blocked_timesheet is not None:
                return await self._response(
                    "generate_invoice",
                    "blocked",
                    f"I found a timesheet for {client.name} for {period_text}, but it is {blocked_timesheet.status.value}. Review or approve it before invoice generation.",
                    {
                        "client_id": client.id,
                        "client_name": client.name,
                        "timesheet_id": blocked_timesheet.id,
                        "timesheet_status": blocked_timesheet.status.value,
                        "billing_period": f"{blocked_timesheet.billing_year}-{blocked_timesheet.billing_month:02d}",
                    },
                )
            return await self._response(
                "generate_invoice",
                "not_found",
                f"I could not find a timesheet for {client.name} for {period_text}.",
                {"client_id": client.id, "client_name": client.name, "billing_period": billing},
            )

        try:
            invoice = await InvoiceService.generate_invoice(self.db, timesheet.id)
        except ValueError as exc:
            return await self._response(
                "generate_invoice",
                "error",
                str(exc),
                {"client_id": client.id, "timesheet_id": timesheet.id},
            )

        message = (
            f"Invoice {invoice.invoice_number} has been generated for {client.name}. "
            f"Grand total is {invoice.currency} {invoice.grand_total}."
        )
        return await self._response(
            "generate_invoice",
            "success",
            message,
            {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "client_id": client.id,
                "client_name": client.name,
                "timesheet_id": timesheet.id,
                "billing_period": f"{timesheet.billing_year}-{timesheet.billing_month:02d}",
                "grand_total": str(invoice.grand_total),
                "currency": invoice.currency,
                "status": invoice.status.value,
                "invoice_pdf_path": invoice.invoice_pdf_path,
            },
        )

    async def _client_invoice_status(self, original_text: str, normalized: str) -> dict[str, Any]:
        client = await self._resolve_client(original_text, normalized)
        if client is None:
            # No specific client named — try answering from data before asking back.
            answered = await self._answer_from_data(original_text)
            if answered is not None:
                return answered
            return await self._response(
                "client_invoice_status",
                "needs_clarification",
                "Tell me which client invoice status you want. You can say client id 1, CL001, or the client name.",
                {"required_field": "client"},
            )

        status_rows = (
            await self.db.execute(
                select(Invoice.status, func.count().label("count"))
                .where(Invoice.client_id == client.id)
                .group_by(Invoice.status)
            )
        ).all()
        status_counts = {row.status.value: row.count for row in status_rows}

        latest_rows = (
            await self.db.execute(
                select(Invoice, Timesheet.billing_year, Timesheet.billing_month)
                .join(Timesheet, Invoice.timesheet_id == Timesheet.id)
                .where(Invoice.client_id == client.id)
                .order_by(Invoice.generated_at.desc())
                .limit(3)
            )
        ).all()

        latest = [
            {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "billing_period": f"{year}-{month:02d}",
                "status": invoice.status.value,
                "approval_status": invoice.approval_status.value,
                "grand_total": str(invoice.grand_total),
                "currency": invoice.currency,
            }
            for invoice, year, month in latest_rows
        ]

        total = sum(status_counts.values())
        if latest:
            latest_invoice = latest[0]
            message = (
                f"{client.name} has {total} invoices. The latest is {latest_invoice['invoice_number']} "
                f"for {latest_invoice['billing_period']} with status {latest_invoice['status']}."
            )
        else:
            message = f"{client.name} has no generated invoices yet."

        return await self._response(
            "client_invoice_status",
            "success",
            message,
            {
                "client_id": client.id,
                "client_name": client.name,
                "invoice_count": total,
                "status_counts": status_counts,
                "latest_invoices": latest,
            },
        )

    async def _finance_overview(self) -> dict[str, Any]:
        total_documents = await self._count(select(func.count()).select_from(Document))
        pending_validation = await self._count(
            select(func.count())
            .select_from(Timesheet)
            .where(Timesheet.status == TimesheetStatus.VALIDATION_PENDING)
        )
        total_invoices = await self._count(select(func.count()).select_from(Invoice))
        revenue = (
            await self.db.execute(select(func.sum(Invoice.grand_total)))
        ).scalar_one()
        revenue = revenue or Decimal("0.00")
        message = (
            f"Finance overview: {total_documents} documents processed, "
            f"{pending_validation} timesheets need review, and {total_invoices} invoices generated."
        )
        return await self._response(
            "finance_overview",
            "success",
            message,
            {
                "total_documents": total_documents,
                "pending_validation": pending_validation,
                "total_invoices": total_invoices,
                "total_revenue": str(revenue),
            },
        )

    async def _find_timesheet_for_invoice(
        self, client_id: int, billing: dict[str, int] | None
    ) -> Timesheet | None:
        stmt = select(Timesheet).where(
            Timesheet.client_id == client_id,
            Timesheet.status.in_([TimesheetStatus.VALIDATED, TimesheetStatus.APPROVED]),
        )
        if billing:
            stmt = stmt.where(
                Timesheet.billing_year == billing["year"],
                Timesheet.billing_month == billing["month"],
            )
        stmt = stmt.order_by(Timesheet.created_at.desc())
        return (await self.db.execute(stmt.limit(1))).scalar_one_or_none()

    async def _find_latest_timesheet(
        self, client_id: int, billing: dict[str, int] | None
    ) -> Timesheet | None:
        stmt = select(Timesheet).where(Timesheet.client_id == client_id)
        if billing:
            stmt = stmt.where(
                Timesheet.billing_year == billing["year"],
                Timesheet.billing_month == billing["month"],
            )
        stmt = stmt.order_by(Timesheet.created_at.desc())
        return (await self.db.execute(stmt.limit(1))).scalar_one_or_none()

    async def _resolve_client(self, original_text: str, normalized: str) -> Client | None:
        client_id = self._extract_client_id(normalized)
        if client_id is not None:
            return (
                await self.db.execute(select(Client).where(Client.id == client_id))
            ).scalar_one_or_none()

        clients = (await self.db.execute(select(Client).order_by(Client.name))).scalars().all()
        lowered_original = original_text.lower()
        for client in clients:
            if client.name.lower() in lowered_original:
                return client

        # Fuzzy fallback for names such as "emaar" or "emirates steel".
        words = [word for word in re.findall(r"[a-z0-9]+", lowered_original) if len(word) >= 4]
        for client in clients:
            client_name = client.name.lower()
            if any(word in client_name for word in words):
                return client
        return None

    def _extract_client_id(self, text: str) -> int | None:
        client_id_match = re.search(r"\bclient\s+(?:id\s*)?(\d+)\b", text)
        if client_id_match:
            return int(client_id_match.group(1))

        code_match = re.search(r"\bcl0*(\d+)\b", text)
        if code_match:
            return int(code_match.group(1))
        return None

    def _extract_billing_period(self, text: str) -> dict[str, int] | None:
        year_match = re.search(r"\b(20\d{2})\b", text)
        month = None
        for token, value in MONTHS.items():
            if re.search(rf"\b{token}\b", text):
                month = value
                break
        if not year_match and month is None:
            return None
        if not year_match or month is None:
            return None
        return {"year": int(year_match.group(1)), "month": month}

    def _billing_text(self, billing: dict[str, int] | None) -> str:
        if not billing:
            return "the latest billing period"
        month_name = next(name.title() for name, value in MONTHS.items() if value == billing["month"] and len(name) > 3)
        return f"{month_name} {billing['year']}"

    async def _count(self, stmt: Any) -> int:
        return int((await self.db.execute(stmt)).scalar_one() or 0)

    async def _unknown_response(self) -> dict[str, Any]:
        return await self._response(
            "unknown",
            "needs_clarification",
            "I can answer pending invoices, timesheets needing review, failed extractions, client invoice status, or generate an invoice for a client.",
            {
                "examples": [
                    "how many invoices are pending",
                    "how many timesheets need review",
                    "show failed extractions",
                    "generate invoice for client CL001 for June 2026",
                    "show invoice status for Emaar Properties",
                ]
            },
        )

    async def _response(
        self, intent: str, status: str, message: str, data: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        response = {
            "intent": intent,
            "status": status,
            "message": message,
            "data": data or {},
        }
        return await self._with_voice(response)

    async def _with_voice(self, response: dict[str, Any]) -> dict[str, Any]:
        voice_result = await self._voice.synthesize_response(
            response["message"],
            intent=response["intent"],
            voice_id=getattr(self, "_voice_id_override", None),
        )
        return {**response, **voice_result}

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.strip().lower())