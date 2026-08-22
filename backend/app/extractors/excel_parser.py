from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


class ExcelExtractor(BaseExtractor):
    document_source = DocumentSource.EXCEL
    parser_name = "docling_structured_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"File not found: {path}")

        try:
            from docling.document_converter import DocumentConverter
        except ModuleNotFoundError:
            raise ExtractionError("docling is not installed")

        try:
            converter = DocumentConverter()
            result = converter.convert(str(path))
            document = result.document

            dataframe = pd.DataFrame()
            for table in getattr(document, "tables", []) or []:
                if hasattr(table, "export_to_dataframe"):
                    df = table.export_to_dataframe()
                    if not df.dropna(how="all").empty:
                        dataframe = df
                        break
                elif hasattr(table, "export_to_pandas"):
                    df = table.export_to_pandas()
                    if not df.dropna(how="all").empty:
                        dataframe = df
                        break

            if dataframe.empty:
                raise ExtractionError(f"No tabular rows found in {path} via Docling.")

            return ExtractionResult(
                dataframe=dataframe,
                confidence=1.0,
                document_source=self.document_source,
                parser_name=self.parser_name,
                metadata={"source_path": str(path)},
            )
        except Exception as exc:
            raise ExtractionError(f"Failed to extract with Docling: {exc}")
