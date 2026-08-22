from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GmailSyncRequest(BaseModel):
    from_email: str | None = None
    to_email: str | None = None
    max_results: int | None = Field(default=None, ge=1, le=50)
    client_id: int | None = None
    include_processed: bool = False


class GmailAttachmentResult(BaseModel):
    message_id: str
    attachment_id: str | None = None
    file_name: str
    content_type: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None
    skipped: bool = False
    # Auto-generated invoices (one per client timesheet parsed from the file)
    invoices: list[dict[str, Any]] = Field(default_factory=list)


class GmailMessageResult(BaseModel):
    message_id: str
    subject: str | None = None
    from_email: str | None = None
    to_email: str | None = None
    attachment_count: int
    processed_count: int
    failed_count: int
    skipped: bool = False
    attachments: list[GmailAttachmentResult]


class GmailSyncResponse(BaseModel):
    query: str
    matched_message_count: int
    processed_message_count: int
    processed_attachment_count: int
    failed_attachment_count: int
    generated_invoice_count: int = 0
    messages: list[GmailMessageResult]