from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


class ExcelExtractor(BaseExtractor):
    document_source = DocumentSource.EXCEL
    parser_name = "pandas_openpyxl_excel_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"Excel file not found: {path}")

        if path.suffix.lower() == ".csv":
            dataframe = pd.read_csv(path)
            sheet_name = None
        else:
            sheets = pd.read_excel(path, sheet_name=None, engine="openpyxl")
            sheet_name, dataframe = self._first_non_empty_sheet(sheets)

        dataframe = dataframe.dropna(how="all")
        if dataframe.empty:
            raise ExtractionError(f"No tabular rows found in Excel file: {path}")

        return ExtractionResult(
            dataframe=dataframe,
            confidence=1.0,
            document_source=self.document_source,
            parser_name=self.parser_name,
            metadata={"sheet_name": sheet_name, "source_path": str(path)},
        )

    @staticmethod
    def _first_non_empty_sheet(sheets: dict[str, pd.DataFrame]) -> tuple[str, pd.DataFrame]:
        for sheet_name, dataframe in sheets.items():
            if not dataframe.dropna(how="all").empty:
                return sheet_name, dataframe
        raise ExtractionError("Workbook contains no non-empty sheets")

