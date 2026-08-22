from __future__ import annotations

from decimal import Decimal, InvalidOperation

import pandas as pd

from app.normalization.mapping_dictionary import LEAVE_CODE_MAPPING


class DataFrameCleaner:
    """Clean normalized DataFrames without applying business validation."""

    NUMERIC_COLUMNS = {
        "working_days",
        "overtime_hours",
        "overtime_amount",
        "deductions",
        "net_pay",
        "gross",
        "basic",
        "housing",
        "transport",
        "food",
        "phone",
        "leave_days",
        "reimbursement_amount",
    }

    def clean(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        frame = dataframe.copy()
        frame = frame.dropna(how="all")
        frame = frame.loc[:, ~frame.columns.astype(str).str.startswith("unnamed")]

        for column in frame.columns:
            if frame[column].dtype == object:
                frame[column] = frame[column].map(self._clean_cell)
            if column in self.NUMERIC_COLUMNS:
                frame[column] = frame[column].map(self._to_decimal_or_none)

        if "leave_type" in frame.columns:
            frame["leave_type"] = frame["leave_type"].map(self._normalize_leave_type)
        if "currency" in frame.columns:
            frame["currency"] = frame["currency"].map(lambda value: str(value).strip().upper() if value else value)

        return frame.reset_index(drop=True)

    @staticmethod
    def _clean_cell(value: object) -> object:
        if value is None or pd.isna(value):
            return None
        if isinstance(value, str):
            value = " ".join(value.replace("\n", " ").split())
            return value or None
        return value

    @staticmethod
    def _to_decimal_or_none(value: object) -> Decimal | None:
        if value is None or pd.isna(value) or value == "":
            return None
        try:
            return Decimal(str(value).replace(",", ""))
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _normalize_leave_type(value: object) -> object:
        if value is None or pd.isna(value):
            return None
        key = str(value).strip().lower()
        return LEAVE_CODE_MAPPING.get(key, value)
