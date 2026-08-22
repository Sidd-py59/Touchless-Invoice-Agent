"""
Data-grounded Q&A for the finance voice agent (RAG over the TIA database).

Retrieval step: the LLM plans a single read-only SQLite query from the schema
description below; it is validated (SELECT-only) and executed against the live
database. Generation step: the LLM answers the user's question strictly from
the returned rows, in a short voice-friendly sentence.

Uses the project's existing Groq integration (same API key as OCR correction).
"""
from __future__ import annotations

import asyncio
import json
import re
import urllib.error
import urllib.request
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

MAX_ROWS = 50
MAX_RESULT_CHARS = 8000

DB_SCHEMA = """
SQLite database for TIA (Touchless Invoice Agent), a payroll-to-invoice platform
run by TASC for its clients. All money amounts are decimals in AED unless a
currency column says otherwise. Timestamps are 'YYYY-MM-DD HH:MM:SS' strings.
Enum columns store UPPERCASE names exactly as listed.

TABLES
clients(id, name, email, billing_address, is_active, created_at, updated_at)
client_configs(id, client_id -> clients.id, currency, service_charge_percentage,
    tax_percentage, max_working_days, max_ot_hours, invoice_prefix,
    dispatch_method, validation_profile, brand_color, payment_terms_days,
    invoice_notes, logo_url)
employees(id, client_id -> clients.id, employee_code, first_name, last_name,
    email, is_active, created_at, updated_at)
payroll_master(id, employee_id -> employees.id, client_id -> clients.id,
    basic_salary, ot_rate_per_hour, allowance, deduction, currency)
documents(id, client_id -> clients.id, source, file_name, file_path, mime_type,
    status, uploaded_at)
    source: EXCEL|PDF|IMAGE|EMAIL|PORTAL|HANDWRITTEN
    status: UPLOADED|PROCESSING|PARSED|FAILED
document_extractions(id, document_id -> documents.id, field_name, field_value,
    confidence, page, row_number, column_name, entity_type, source)
timesheets(id, document_id -> documents.id, client_id -> clients.id,
    billing_year, billing_month, status, created_at)
    status: DRAFT|PROCESSING|VALIDATION_PENDING|VALIDATED|APPROVED|INVOICED
    (billing_year int e.g. 2026, billing_month int 1-12)
timesheet_entries(id, timesheet_id -> timesheets.id, employee_id -> employees.id,
    raw_employee_code, raw_employee_name, working_days, ot_hours, leave_days,
    remarks, confidence, salary_basic, salary_allowance, salary_deduction,
    salary_ot_amount)
validation_results(id, timesheet_entry_id -> timesheet_entries.id, rule_name,
    status, severity, expected, actual, message, resolved, resolved_by)
    status: PASSED|FAILED   severity: INFO|WARNING|ERROR
    rule_name examples: 'Employee Exists', 'Client Mismatch',
    'Working Days Limit', 'Duplicate Employee', 'Overtime Limit'
invoices(id, invoice_number, client_id -> clients.id,
    timesheet_id -> timesheets.id, invoice_date, due_date, currency,
    invoice_pdf_path, subtotal, service_charge, tax, grand_total, status,
    approval_status, approved_by, approved_at, generated_at)
    status: DRAFT|SENT|PAID|OVERDUE|VOID
    approval_status: PENDING|APPROVED|REJECTED
invoice_items(id, invoice_id -> invoices.id, employee_id -> employees.id,
    gross_salary, ot_amount, allowance, deduction, bill_amount)
client_queries(id, client_id -> clients.id, invoice_id, subject, body, status,
    resolution_note, resolved_by, created_at)
    status: OPEN|RESOLVED

NOTES
- "Pending / outstanding invoices" usually means status IN ('DRAFT','SENT','OVERDUE').
- "Revenue" or "billed amount" = SUM(invoices.grand_total).
- Employee full name = first_name || ' ' || last_name.
- A mixed payroll upload produces one timesheet per client for the same document.
- Match client names case-insensitively with LIKE '%...%'.
"""

_FORBIDDEN_SQL = re.compile(
    r"\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|"
    r"vacuum|reindex|truncate|grant|revoke)\b",
    re.IGNORECASE,
)


class DataInsightService:
    """LLM-planned, read-only SQL retrieval + grounded answer generation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def available() -> bool:
        return bool(settings.GROQ_API_KEY)

    async def answer(self, question: str) -> dict[str, Any] | None:
        """Answer a free-form question from live data. None = cannot answer."""
        if not self.available():
            return None

        plan = await self._plan_sql(question)
        if not plan or not plan.get("sql"):
            return None

        sql = self._sanitize_sql(str(plan["sql"]))
        if not sql:
            return None

        rows, error = await self._run_sql(sql)
        if error:
            # One repair round: let the model fix its own SQL from the DB error.
            plan = await self._plan_sql(question, previous_sql=sql, previous_error=error)
            if not plan or not plan.get("sql"):
                return None
            sql = self._sanitize_sql(str(plan["sql"]))
            if not sql:
                return None
            rows, error = await self._run_sql(sql)
            if error:
                return None

        message = await self._compose_answer(question, sql, rows)
        if not message:
            return None

        return {
            "message": message,
            "data": {
                "source": "database",
                "sql": sql,
                "row_count": len(rows),
                "rows": rows[:10],
            },
        }

    # ------------------------------------------------------------------ LLM

    async def _plan_sql(
        self,
        question: str,
        previous_sql: str | None = None,
        previous_error: str | None = None,
    ) -> dict[str, Any] | None:
        user_content = f"Question: {question}"
        if previous_sql and previous_error:
            user_content += (
                f"\n\nYour previous query failed.\nSQL: {previous_sql}\n"
                f"Error: {previous_error}\nReturn a corrected query."
            )

        messages = [
            {
                "role": "system",
                "content": (
                    "You write a single read-only SQLite SELECT query to fetch the data "
                    "needed to answer a finance question. Use only the schema below. "
                    "Prefer aggregates over raw dumps; always keep results small "
                    f"(LIMIT {MAX_ROWS} or less). Respond with JSON only: "
                    '{"sql": "SELECT ..."} or {"sql": null, "reason": "..."} if the '
                    "question cannot be answered from this database.\n" + DB_SCHEMA
                ),
            },
            {"role": "user", "content": user_content},
        ]
        content = await self._groq_chat(messages, json_mode=True)
        if not content:
            return None
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return None

    async def _compose_answer(
        self, question: str, sql: str, rows: list[dict[str, Any]]
    ) -> str | None:
        results_text = json.dumps(rows, ensure_ascii=False)[:MAX_RESULT_CHARS]
        messages = [
            {
                "role": "system",
                "content": (
                    "You are TIA, a finance operations voice assistant. Answer the "
                    "user's question using ONLY the query results provided. Reply in "
                    "one to three short spoken-style sentences with exact figures "
                    "(format money like 'AED 12,345.67'). If the results are empty, "
                    "say no matching data was found. Never mention SQL, queries, "
                    "tables, or JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\nQuery results (JSON rows):\n{results_text}"
                ),
            },
        ]
        return await self._groq_chat(messages, json_mode=False)

    async def _groq_chat(
        self, messages: list[dict[str, str]], *, json_mode: bool
    ) -> str | None:
        payload: dict[str, Any] = {
            "model": settings.GROQ_AGENT_MODEL,
            "messages": messages,
            "temperature": 0,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        def _post() -> str | None:
            request = urllib.request.Request(
                f"{settings.GROQ_API_BASE_URL.rstrip('/')}/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                    # Cloudflare rejects urllib's default UA with HTTP 403 (code 1010)
                    "User-Agent": "tia-backend/1.0",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(
                    request, timeout=settings.GROQ_REQUEST_TIMEOUT_SECONDS
                ) as response:
                    body = json.loads(response.read().decode("utf-8"))
            except (urllib.error.URLError, json.JSONDecodeError, TimeoutError):
                return None
            content = body.get("choices", [{}])[0].get("message", {}).get("content")
            return str(content).strip() if content else None

        return await asyncio.to_thread(_post)

    # ------------------------------------------------------------------ SQL

    @staticmethod
    def _sanitize_sql(sql: str) -> str | None:
        cleaned = sql.strip().rstrip(";").strip()
        if ";" in cleaned:
            return None
        if not re.match(r"^\s*(select|with)\b", cleaned, re.IGNORECASE):
            return None
        if _FORBIDDEN_SQL.search(cleaned):
            return None
        if not re.search(r"\blimit\s+\d+", cleaned, re.IGNORECASE):
            cleaned = f"{cleaned} LIMIT {MAX_ROWS}"
        return cleaned

    async def _run_sql(self, sql: str) -> tuple[list[dict[str, Any]], str | None]:
        try:
            result = await self.db.execute(text(sql))
            keys = list(result.keys())
            rows = [
                {key: self._json_value(value) for key, value in zip(keys, row)}
                for row in result.fetchmany(MAX_ROWS)
            ]
            return rows, None
        except Exception as exc:  # surface DB error text for the repair round
            await self.db.rollback()
            return [], str(exc)[:500]

    @staticmethod
    def _json_value(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        return value
