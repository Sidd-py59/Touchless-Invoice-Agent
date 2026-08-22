from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ExtractedTablePayload(BaseModel):
    headers: list[str]
    rows: list[list[Any]]
    confidence: float = Field(ge=0.0, le=1.0)
    document_source: str
    parser_name: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    verified_by_ai: bool = False
    needs_review: bool = False


class CanonicalTimesheetRow(BaseModel):
    employee_id: str | None = None
    employee_name: str | None = None
    client_code: str | None = None
    client_name: str | None = None
    billing_period: str | None = None
    department: str | None = None
    role: str | None = None
    working_days: float | None = None
    overtime_hours: float | None = None
    overtime_amount: float | None = None
    leave_type: str | None = None
    leave_days: float | None = None
    reimbursement_amount: float | None = None
    reimbursement_reason: str | None = None
    currency: str | None = None
    confidence: float = 1.0

