from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from app.extractors.image_parser import ImageExtractor
from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


def render_pdf_first_page(path: Path) -> Path:
    image_path = path.with_suffix(".page1.png")
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(str(path))
        page = None
        try:
            if len(pdf) == 0:
                raise ExtractionError(f"PDF has no pages: {path}")
            page = pdf[0]
            bitmap = page.render(scale=2).to_pil()
            bitmap.save(image_path)
            return image_path
        finally:
            if page is not None and hasattr(page, "close"):
                page.close()
            if hasattr(pdf, "close"):
                pdf.close()
    except Exception as exc:
        raise ExtractionError(f"Could not rasterize PDF first page: {exc}") from exc


class DigitalPdfExtractor(BaseExtractor):
    document_source = DocumentSource.PDF
    parser_name = "docling_pdf_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"PDF file not found: {path}")

        try:
            from docling.document_converter import DocumentConverter
        except ModuleNotFoundError:
            raise ExtractionError("docling is not installed")

        try:
            converter = DocumentConverter()
            result = converter.convert(str(path))
            document = result.document
            dataframe = self._extract_first_table(document)

            if dataframe.empty:
                raise ExtractionError("Docling extracted no tabular rows.")

            return ExtractionResult(
                dataframe=dataframe,
                confidence=0.98,
                document_source=self.document_source,
                parser_name=self.parser_name,
                metadata={"source_path": str(path), "docling_tables": len(getattr(document, "tables", []) or [])},
            )
        except Exception as exc:
            raise ExtractionError(f"Failed to extract with Docling: {exc}")

    @staticmethod
    def _extract_first_table(document: Any) -> pd.DataFrame:
        for table in getattr(document, "tables", []) or []:
            if hasattr(table, "export_to_dataframe"):
                dataframe = table.export_to_dataframe()
                if not dataframe.empty:
                    return dataframe
            elif hasattr(table, "export_to_pandas"):
                dataframe = table.export_to_pandas()
                if not dataframe.empty:
                    return dataframe
        return pd.DataFrame()


class ScannedPdfExtractor(BaseExtractor):
    document_source = DocumentSource.PDF
    parser_name = "pdf_raster_paddleocr_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"PDF file not found: {path}")
        if path.suffix.lower() != ".pdf":
            raise ExtractionError("Scanned PDF extraction requires a PDF file.")

        image_path = render_pdf_first_page(path)
        result = ImageExtractor().extract(image_path)
        result.document_source = self.document_source
        result.parser_name = self.parser_name
        result.metadata["source_path"] = str(path)
        result.metadata["rasterized_image_path"] = str(image_path)
        result.warnings.append("Scanned PDF processed via PaddleOCR; AI correction is strictly applied.")
        return result
