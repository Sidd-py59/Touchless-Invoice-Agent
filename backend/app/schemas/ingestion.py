from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EmailIngestionRequest(BaseModel):
    body: str = Field(min_length=1)
    subject: str | None = None
    client_id: int | None = None


class IngestionResponse(BaseModel):
    document_id: int
    document_extraction_count: int
    timesheet_id: int
    # One timesheet per client detected in the document (mixed payroll files
    # spanning several clients produce several timesheets). timesheet_id above
    # remains the primary one for backward compatibility.
    timesheet_ids: list[int] = Field(default_factory=list)
    # Touchless automation results: invoices generated/approved/sent for every
    # cleanly validated timesheet ("skipped" entries need human review first).
    invoices: list[dict[str, Any]] = Field(default_factory=list)
    document_source: str
    status: str
    parser_name: str
    confidence: float
    needs_review: bool
    source_hash: str
    extracted_table: dict[str, Any]
    canonical_sql: dict[str, Any]
