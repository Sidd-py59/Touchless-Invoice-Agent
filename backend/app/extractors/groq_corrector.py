from __future__ import annotations

import base64
import json
import mimetypes
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from app.extractors.types import ExtractionError


class GroqTableCorrectionClient:
    """Groq vision/text client for correcting OCR table extraction mistakes."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str = "https://api.groq.com/openai/v1",
        timeout_seconds: int = 60,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def correct_table(
        self,
        *,
        headers: list[str],
        rows: list[list[object]],
        ocr_text: str | None = None,
        image_path: Path | None = None,
        context: dict[str, object] | None = None,
    ) -> dict[str, object]:
        messages = [
            {
                "role": "system",
                "content": self._system_prompt(),
            },
            {
                "role": "user",
                "content": self._content(headers=headers, rows=rows, ocr_text=ocr_text, image_path=image_path, context=context),
            },
        ]
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        response = self._post_json("/chat/completions", payload)
        content = response.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise ExtractionError("Groq correction returned an empty response")
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise ExtractionError("Groq correction did not return valid JSON") from exc

        corrected_headers = parsed.get("headers")
        corrected_rows = parsed.get("rows")
        if not isinstance(corrected_headers, list) or not isinstance(corrected_rows, list):
            raise ExtractionError("Groq correction JSON must contain headers and rows arrays")
        return {
            "headers": corrected_headers,
            "rows": corrected_rows,
            "confidence": float(parsed.get("confidence", 0.9)),
            "notes": parsed.get("notes") or [],
        }

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        request = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "tia-ingestion/0.1",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise ExtractionError(f"Groq correction failed with HTTP {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise ExtractionError(f"Groq correction request failed: {exc.reason}") from exc

    @staticmethod
    def _system_prompt() -> str:
        return (
            "You correct OCR/table extraction errors for TASC timesheet ingestion only. "
            "Return JSON only with keys: headers, rows, confidence, notes. "
            "Do not calculate payroll, validate business rules, invent missing rows, or approve data. "
            "Preserve source values unless correcting obvious OCR/header/column-placement errors. "
            "Normalize table structure so each row has the same number of cells as headers. "
            "For this dataset, employee IDs usually look like EMP10001; correct obvious OCR variants such as FMP10001 to EMP10001. "
            "Client codes usually look like CL001; if a client code is merged into employee name or client name, split it into Client Code. "
            "Employee Name should contain the person name only, not labels like client code and not CL codes. "
            "Pay Period should preserve month/year text such as June 2026. "
            "Working Days and OT Hours must remain in their own columns and must not be swapped. "
            "IMPORTANT: Do NOT map money/currency/amount columns (like 'Basic', 'Gross', 'Net Pay', 'Deductions', 'OT Amount') to 'Working Days' or 'OT Hours'. "
            "Columns representing hours worked (e.g., 'OT Hours', 'O urs', 'Overtime Hours') must be mapped to 'OT Hours'. "
            "If the source table does not have a column for 'Working Days', do NOT map random columns to it."
        )

    def _content(
        self,
        *,
        headers: list[str],
        rows: list[list[object]],
        ocr_text: str | None,
        image_path: Path | None,
        context: dict[str, object] | None,
    ) -> list[dict[str, Any]]:
        instruction = {
            "task": "Correct the extracted table structure from a scanned or handwritten timesheet.",
            "expected_common_columns": [
                "Emp ID",
                "Employee Name",
                "Client Code",
                "Client Name",
                "Pay Period",
                "OT Hours",
                "Working Days",
            ],
            "current_headers": headers,
            "current_rows": rows,
            "ocr_text": ocr_text,
            "context": context or {},
        }
        content: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": json.dumps(instruction, default=str),
            }
        ]
        if image_path and image_path.exists():
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": self._data_url(image_path)},
                }
            )
        return content

    @staticmethod
    def _data_url(path: Path) -> str:
        mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"






