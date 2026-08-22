from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.extractors.types import ExtractionResult
from app.models.document import DocumentExtraction
from app.models.timesheet import Timesheet, TimesheetEntry, TimesheetStatus


class DataFrameRepository:
    """Persist normalized DataFrames into the original codebase schema."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def store_document_extractions(
        self,
        *,
        document_id: int,
        result: ExtractionResult,
    ) -> list[DocumentExtraction]:
        extractions: list[DocumentExtraction] = []
        frame = result.dataframe.where(pd.notnull(result.dataframe), None)

        for row_index, row in frame.reset_index(drop=True).iterrows():
            for column, value in row.items():
                extraction = DocumentExtraction(
                    document_id=document_id,
                    field_name=self._field_name(row_index, column),
                    field_value=self._text(value),
                    confidence=result.confidence,
                    page=None,
                    bbox=None,
                    source=result.parser_name,
                )
                self.session.add(extraction)
                extractions.append(extraction)

        await self.session.flush()
        return extractions

    async def store_canonical_timesheet(
        self,
        *,
        document_id: int | None,
        client_id: int,
        dataframe: pd.DataFrame,
        billing_month: str,
        document_confidence: float | None,
    ) -> Timesheet:
        timesheet = Timesheet(
            document_id=document_id,
            client_id=client_id,
            billing_month=billing_month,
            status=TimesheetStatus.VALIDATION_PENDING,
        )
        self.session.add(timesheet)
        await self.session.flush()

        for _, series in dataframe.reset_index(drop=True).iterrows():
            entry = self._row_to_entry(timesheet.id, series, confidence=document_confidence or 1.0)
            self.session.add(entry)

        await self.session.flush()
        return timesheet

    @staticmethod
    def _row_to_entry(timesheet_id: int, row: pd.Series, confidence: float) -> TimesheetEntry:
        return TimesheetEntry(
            timesheet_id=timesheet_id,
            employee_id=None,
            raw_employee_code=DataFrameRepository._nullable_text(row.get("employee_id")),
            raw_employee_name=DataFrameRepository._nullable_text(row.get("employee_name")),
            working_days=DataFrameRepository._decimal(row.get("working_days"), default=Decimal("0.00")),
            ot_hours=DataFrameRepository._decimal(
                DataFrameRepository._first(row, "overtime_hours", "ot_hours"),
                default=Decimal("0.00"),
            ),
            leave_days=DataFrameRepository._decimal(row.get("leave_days"), default=Decimal("0.00")),
            remarks=json.dumps(row.dropna().to_dict(), default=str),
            confidence=confidence,
        )

    @staticmethod
    def _first(row: pd.Series, *columns: str) -> Any | None:
        for column in columns:
            value = row.get(column)
            if value is not None and not pd.isna(value):
                return value
        return None

    @staticmethod
    def _field_name(row_index: int, column: object) -> str:
        return f"row_{row_index}.{column}"[:100]

    @staticmethod
    def _text(value: Any) -> str:
        if value is None or pd.isna(value):
            return ""
        return str(value)

    @staticmethod
    def _nullable_text(value: Any) -> str | None:
        text = DataFrameRepository._text(value).strip()
        return text or None

    @staticmethod
    def _decimal(value: Any, default: Decimal) -> Decimal:
        if value is None or pd.isna(value) or value == "":
            return default
        if isinstance(value, Decimal):
            return value
        try:
            return Decimal(str(value).replace(",", ""))
        except Exception:
            return default

