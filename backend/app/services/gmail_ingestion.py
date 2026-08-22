from __future__ import annotations

import base64
import json
import mimetypes
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
import urllib.error
import urllib.request
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.extractors.types import ExtractionError
from app.services.ingestion import IngestionService

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
ATTACHMENT_ROOT = Path("storage/uploads/gmail_attachments")
IMAGE_ATTACHMENT_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
}

SUPPORTED_ATTACHMENT_EXTENSIONS = {
    ".xlsx",
    ".xls",
    ".csv",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".webp",
}


@dataclass(slots=True)
class GmailAttachment:
    message_id: str
    attachment_id: str | None
    file_name: str
    content_type: str | None
    data: bytes


class GmailApiError(RuntimeError):
    pass


class GmailIngestionService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.ingestion_service = IngestionService(session)
        self.processed_store = Path(settings.GMAIL_PROCESSED_STORE)

    async def sync(
        self,
        *,
        from_email: str | None = None,
        to_email: str | None = None,
        max_results: int | None = None,
        client_id: int | None = None,
        include_processed: bool = False,
    ) -> dict[str, Any]:
        self._ensure_configured()
        from_email = from_email or settings.GMAIL_SYNC_FROM_EMAIL
        to_email = to_email or settings.GMAIL_SYNC_TO_EMAIL
        max_results = max_results or settings.GMAIL_SYNC_MAX_RESULTS
        query = self._query(from_email=from_email, to_email=to_email)

        processed_keys = self._load_processed_ids()
        access_token = await self._access_token()
        message_refs = await self._list_messages(access_token=access_token, query=query, max_results=max_results)

        message_results: list[dict[str, Any]] = []
        processed_message_count = 0
        processed_attachment_count = 0
        failed_attachment_count = 0
        generated_invoice_count = 0

        for message_ref in message_refs:
            message_id = str(message_ref["id"])
            message = await self._get_message(access_token=access_token, message_id=message_id)
            headers = self._headers(message)
            attachments = await self._extract_attachments(access_token=access_token, message=message)
            attachment_results = []

            for attachment in attachments:
                processed_key = self._attachment_key(attachment)
                if processed_key in processed_keys and not include_processed:
                    attachment_results.append(
                        {
                            "message_id": attachment.message_id,
                            "attachment_id": attachment.attachment_id,
                            "file_name": self._safe_filename(attachment.file_name),
                            "content_type": attachment.content_type,
                            "result": None,
                            "error": None,
                            "skipped": True,
                        }
                    )
                    continue

                result_item = await self._ingest_attachment(attachment=attachment, client_id=client_id)
                result_item["skipped"] = False
                # Mark as processed regardless of zero-rows outcome so we don't
                # re-ingest the same attachment on every background sync cycle.
                if not result_item.get("_api_error"):
                    processed_keys.add(processed_key)
                if result_item.get("result") is not None:
                    processed_attachment_count += 1
                else:
                    failed_attachment_count += 1
                generated_invoice_count += sum(
                    1
                    for inv in result_item.get("invoices") or []
                    if inv.get("invoice_id") is not None
                )
                attachment_results.append(result_item)

            processed_count = sum(1 for item in attachment_results if item.get("result") is not None)
            failed_count = sum(
                1
                for item in attachment_results
                if not item.get("skipped") and item.get("result") is None
            )
            skipped = bool(attachment_results) and all(item.get("skipped") for item in attachment_results)
            if processed_count > 0:
                processed_message_count += 1

            message_results.append(
                {
                    "message_id": message_id,
                    "subject": headers.get("subject"),
                    "from_email": headers.get("from"),
                    "to_email": headers.get("to"),
                    "attachment_count": len(attachment_results),
                    "processed_count": processed_count,
                    "failed_count": failed_count,
                    "skipped": skipped,
                    "attachments": attachment_results,
                }
            )

        self._save_processed_ids(processed_keys)
        return {
            "query": query,
            "matched_message_count": len(message_refs),
            "processed_message_count": processed_message_count,
            "processed_attachment_count": processed_attachment_count,
            "failed_attachment_count": failed_attachment_count,
            "generated_invoice_count": generated_invoice_count,
            "messages": message_results,
        }

    @staticmethod
    def _ensure_configured() -> None:
        missing = [
            name
            for name, value in {
                "GMAIL_CLIENT_ID": settings.GMAIL_CLIENT_ID,
                "GMAIL_CLIENT_SECRET": settings.GMAIL_CLIENT_SECRET,
                "GMAIL_REFRESH_TOKEN": settings.GMAIL_REFRESH_TOKEN,
            }.items()
            if not value
        ]
        if missing:
            raise ValueError(
                "Gmail sync is not configured. Missing: "
                + ", ".join(missing)
                + ". Configure OAuth credentials in backend/.env."
            )

    @staticmethod
    def _query(*, from_email: str, to_email: str) -> str:
        # Empty filters are omitted: with no from_email, payroll mails from ANY
        # sender to the configured mailbox are picked up.
        parts = ["in:anywhere"]
        if from_email:
            parts.append(f"from:{from_email}")
        if to_email:
            parts.append(f"to:{to_email}")
        parts.append("has:attachment")
        return " ".join(parts)

    async def _access_token(self) -> str:
        payload = urlencode(
            {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type": "refresh_token",
            }
        ).encode("utf-8")
        data = await self._request_json(
            GOOGLE_TOKEN_URL,
            method="POST",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            auth_token=None,
        )
        token = data.get("access_token")
        if not token:
            raise GmailApiError("Google OAuth token refresh did not return an access_token")
        return str(token)

    async def _list_messages(self, *, access_token: str, query: str, max_results: int) -> list[dict[str, Any]]:
        params = urlencode({"q": query, "maxResults": max_results})
        data = await self._request_json(
            f"{GMAIL_API_BASE}/users/me/messages?{params}",
            auth_token=access_token,
        )
        return list(data.get("messages") or [])

    async def _get_message(self, *, access_token: str, message_id: str) -> dict[str, Any]:
        params = urlencode({"format": "full"})
        return await self._request_json(
            f"{GMAIL_API_BASE}/users/me/messages/{message_id}?{params}",
            auth_token=access_token,
        )

    async def _get_attachment(self, *, access_token: str, message_id: str, attachment_id: str) -> bytes:
        data = await self._request_json(
            f"{GMAIL_API_BASE}/users/me/messages/{message_id}/attachments/{attachment_id}",
            auth_token=access_token,
        )
        encoded = str(data.get("data") or "")
        return self._decode_gmail_data(encoded)

    async def _extract_attachments(self, *, access_token: str, message: dict[str, Any]) -> list[GmailAttachment]:
        message_id = str(message["id"])
        attachments: list[GmailAttachment] = []
        for part in self._walk_parts(message.get("payload") or {}):
            filename = str(part.get("filename") or "").strip()
            if not filename:
                continue
            body = part.get("body") or {}
            attachment_id = body.get("attachmentId")
            content_type = part.get("mimeType") or mimetypes.guess_type(filename)[0]
            if attachment_id:
                data = await self._get_attachment(access_token=access_token, message_id=message_id, attachment_id=str(attachment_id))
            else:
                data = self._decode_gmail_data(str(body.get("data") or ""))
            attachments.append(
                GmailAttachment(
                    message_id=message_id,
                    attachment_id=str(attachment_id) if attachment_id else None,
                    file_name=filename,
                    content_type=content_type,
                    data=data,
                )
            )
        return attachments

    async def _ingest_attachment(self, *, attachment: GmailAttachment, client_id: int | None) -> dict[str, Any]:
        safe_name = self._safe_filename(attachment.file_name)
        suffix = Path(safe_name).suffix.lower()
        item: dict[str, Any] = {
            "message_id": attachment.message_id,
            "attachment_id": attachment.attachment_id,
            "file_name": safe_name,
            "content_type": attachment.content_type,
            "result": None,
            "error": None,
        }

        item["invoices"] = []

        if suffix not in SUPPORTED_ATTACHMENT_EXTENSIONS:
            item["error"] = f"Unsupported attachment type: {suffix or 'unknown'}"
            return item
        if not attachment.data:
            item["error"] = "Attachment is empty"
            return item

        ATTACHMENT_ROOT.mkdir(parents=True, exist_ok=True)
        saved_path = ATTACHMENT_ROOT / f"{uuid4().hex}_{safe_name}"
        saved_path.write_bytes(attachment.data)

        try:
            item["result"] = await self.ingestion_service.ingest_file(
                path=saved_path,
                file_name=safe_name,
                mime_type=attachment.content_type or mimetypes.guess_type(safe_name)[0],
                client_id=client_id,
                scanned=suffix == ".pdf" and self._looks_scanned_pdf(attachment),
                handwritten=suffix in IMAGE_ATTACHMENT_EXTENSIONS,
            )
            row_count = len(item["result"].get("extracted_table", {}).get("rows", []))
            if row_count == 0:
                item["result"] = None
                item["error"] = "Attachment parsed but produced zero employee rows."
            else:
                # Touchless automation (invoice + approve + send) already ran
                # inside ingest_file; surface its results per attachment.
                item["invoices"] = item["result"].get("invoices", [])
        except GmailApiError as exc:
            # Transient API failure — allow retry on next sync cycle
            await self.session.rollback()
            item["error"] = str(exc)
            item["_api_error"] = True
        except (ExtractionError, ValueError) as exc:
            # Parsing failure — don't retry, mark as processed
            await self.session.rollback()
            item["error"] = str(exc)
        return item

    @staticmethod
    def _looks_scanned_pdf(attachment: GmailAttachment) -> bool:
        content_type = (attachment.content_type or "").lower()
        name = attachment.file_name.lower()
        if "scan" in name or "scanned" in name or "handwritten" in name:
            return True
        return "image" in content_type

    @staticmethod
    def _attachment_key(attachment: GmailAttachment) -> str:
        # Gmail attachment IDs are ephemeral (they change on every message
        # fetch), so they cannot be used for deduplication. Filename + size is
        # stable across fetches and unique enough within a single message.
        return f"{attachment.message_id}:{attachment.file_name}:{len(attachment.data)}"

    @staticmethod
    def _headers(message: dict[str, Any]) -> dict[str, str]:
        headers = {}
        for header in (message.get("payload") or {}).get("headers") or []:
            name = str(header.get("name") or "").lower()
            if name in {"subject", "from", "to"}:
                headers[name] = str(header.get("value") or "")
        return headers

    @classmethod
    def _walk_parts(cls, payload: dict[str, Any]):
        yield payload
        for part in payload.get("parts") or []:
            yield from cls._walk_parts(part)

    @staticmethod
    def _decode_gmail_data(encoded: str) -> bytes:
        if not encoded:
            return b""
        padding = "=" * (-len(encoded) % 4)
        return base64.urlsafe_b64decode((encoded + padding).encode("ascii"))

    def _load_processed_ids(self) -> set[str]:
        if not self.processed_store.exists():
            return set()
        try:
            data = json.loads(self.processed_store.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return set()
        return {str(item) for item in data.get("message_ids", [])}

    def _save_processed_ids(self, message_ids: set[str]) -> None:
        self.processed_store.parent.mkdir(parents=True, exist_ok=True)
        self.processed_store.write_text(
            json.dumps({"message_ids": sorted(message_ids)}, indent=2),
            encoding="utf-8",
        )

    @staticmethod
    def _safe_filename(filename: str) -> str:
        safe = Path(filename).name
        safe = "".join(char if char.isalnum() or char in "._-" else "_" for char in safe).strip("._")
        return safe or "attachment"

    @staticmethod
    async def _request_json(
        url: str,
        *,
        method: str = "GET",
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        auth_token: str | None,
    ) -> dict[str, Any]:
        import asyncio
        return await asyncio.to_thread(
            GmailIngestionService._request_json_sync,
            url,
            method=method,
            data=data,
            headers=headers,
            auth_token=auth_token,
        )

    @staticmethod
    def _request_json_sync(
        url: str,
        *,
        method: str = "GET",
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        auth_token: str | None,
    ) -> dict[str, Any]:
        request_headers = dict(headers or {})
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
        request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise GmailApiError(f"Gmail API failed with HTTP {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise GmailApiError(f"Gmail API request failed: {exc.reason}") from exc