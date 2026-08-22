from __future__ import annotations

import csv
import re
from io import StringIO

import pandas as pd

from app.extractors.types import ExtractionError, ExtractionResult
from app.models.document import DocumentSource


class EmailBodyExtractor:
    """Extract table-like timesheet data from pasted email text.

    This parser is intentionally deterministic. It handles common demo formats:
    markdown tables, CSV-like blocks, tab-separated blocks, and simple key/value
    lines. AI verification can be layered after this if confidence is low.
    """

    document_source = DocumentSource.EMAIL
    parser_name = "deterministic_email_body_parser_v1"

    def extract_text(self, text: str) -> ExtractionResult:
        text = text.strip()
        if not text:
            raise ExtractionError("Email body is empty")

        dataframe = self._parse_markdown_table(text)
        confidence = 0.9
        strategy = "markdown_table"

        if dataframe.empty:
            dataframe = self._parse_delimited_block(text)
            confidence = 0.85
            strategy = "delimited_block"

        if dataframe.empty:
            dataframe = self._parse_key_values(text)
            confidence = 0.65
            strategy = "key_value_lines"

        if dataframe.empty:
            raise ExtractionError("Could not extract table-like data from email body")

        return ExtractionResult(
            dataframe=dataframe,
            confidence=confidence,
            document_source=self.document_source,
            parser_name=self.parser_name,
            metadata={"strategy": strategy, "raw_text": text},
        )

    @staticmethod
    def _parse_markdown_table(text: str) -> pd.DataFrame:
        lines = [line.strip() for line in text.splitlines() if "|" in line]
        table_lines = [line for line in lines if not re.fullmatch(r"\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?", line)]
        if len(table_lines) < 2:
            return pd.DataFrame()

        rows: list[list[str]] = []
        for line in table_lines:
            parts = [part.strip() for part in line.strip("|").split("|")]
            if any(parts):
                rows.append(parts)
        if len(rows) < 2:
            return pd.DataFrame()

        width = max(len(row) for row in rows)
        rows = [row + [None] * (width - len(row)) for row in rows]
        return pd.DataFrame(rows[1:], columns=rows[0])

    @staticmethod
    def _parse_delimited_block(text: str) -> pd.DataFrame:
        candidate_lines = [line.strip() for line in text.splitlines() if line.strip()]
        if len(candidate_lines) < 2:
            return pd.DataFrame()

        for delimiter in [",", "\t", ";"]:
            likely = [line for line in candidate_lines if delimiter in line]
            if len(likely) < 2:
                continue
            try:
                reader = csv.reader(StringIO("\n".join(likely)), delimiter=delimiter)
                rows = [row for row in reader if any(cell.strip() for cell in row)]
            except csv.Error:
                continue
            if len(rows) < 2:
                continue
            width = max(len(row) for row in rows)
            rows = [row + [None] * (width - len(row)) for row in rows]
            return pd.DataFrame(rows[1:], columns=rows[0])
        return pd.DataFrame()

    @staticmethod
    def _parse_key_values(text: str) -> pd.DataFrame:
        values: dict[str, str] = {}
        for line in text.splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
            elif "=" in line:
                key, value = line.split("=", 1)
            else:
                continue
            key = key.strip()
            value = value.strip()
            if key and value:
                values[key] = value
        if not values:
            return pd.DataFrame()
        return pd.DataFrame([values])

