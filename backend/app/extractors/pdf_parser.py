from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.config import settings

from app.extractors.image_parser import ImageExtractor
from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


def render_pdf_first_page(path: Path) -> Path:
    image_path = path.with_suffix(".page1.png")

    try:
        from pdf2image import convert_from_path

        pages = convert_from_path(str(path), first_page=1, last_page=1)
        if pages:
            pages[0].save(image_path)
            return image_path
    except Exception:
        pass

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
    except ModuleNotFoundError as exc:
        raise ExtractionError("Scanned PDF extraction requires pypdfium2 or pdf2image with Poppler") from exc
    except Exception as exc:
        raise ExtractionError(f"Could not rasterize PDF first page: {exc}") from exc


class DigitalPdfExtractor(BaseExtractor):
    document_source = DocumentSource.PDF
    parser_name = "pypdf_docling_pdf_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"PDF file not found: {path}")

        # Strategy 1: Fast text extraction with pypdf
        pypdf_frame, raw_text = self._extract_with_pypdf(path)
        if not pypdf_frame.empty:
            return ExtractionResult(
                dataframe=pypdf_frame,
                confidence=0.9,
                document_source=self.document_source,
                parser_name="pypdf_text_table_parser_v1",
                metadata={"source_path": str(path), "raw_text": raw_text[:10000]},
            )

        if not settings.PDF_DOCLING_FALLBACK_ENABLED:
            raise ExtractionError(
                "Fast PDF extraction did not find a timesheet table. If this is a scanned PDF, retry with scanned=true. "
                "If this is a complex digital PDF, set PDF_DOCLING_FALLBACK_ENABLED=true to allow slower Docling/OCR parsing."
            )

        # Strategy 2: Docling layout-aware parsing (if explicitly enabled)
        docling_result = self._try_docling(path)
        if docling_result is not None:
            return docling_result

        # Strategy 3: Rasterize first page and run through image OCR pipeline (if explicitly enabled)
        ocr_result = self._try_rasterize_ocr(path)
        if ocr_result is not None:
            return ocr_result

        raise ExtractionError(
            f"Could not extract a timesheet table from PDF: {path}. "
            "Tried pypdf text extraction, Docling layout parsing, and page rasterization + OCR."
        )

    def _try_docling(self, path: Path) -> ExtractionResult | None:
        try:
            from docling.document_converter import DocumentConverter
        except ModuleNotFoundError:
            return None

        try:
            converter = DocumentConverter()
            result = converter.convert(str(path), page_range=(1, 2))
            document = result.document
            dataframe = self._extract_first_table(document)

            if dataframe.empty:
                return None

            return ExtractionResult(
                dataframe=dataframe,
                confidence=0.98,
                document_source=self.document_source,
                parser_name="docling_pdf_table_parser_v1",
                metadata={"source_path": str(path), "docling_tables": len(getattr(document, "tables", []) or [])},
            )
        except Exception:
            return None

    def _try_rasterize_ocr(self, path: Path) -> ExtractionResult | None:
        try:
            image_path = render_pdf_first_page(path)
            result = ImageExtractor().extract(image_path)
            result.document_source = self.document_source
            result.parser_name = "pdf_auto_rasterize_ocr_v1"
            result.confidence = min(result.confidence, 0.75)
            result.metadata["source_path"] = str(path)
            result.metadata["rasterized_image_path"] = str(image_path)
            result.metadata["requires_ai_correction"] = True
            result.warnings.append("PDF was rasterized and processed via OCR; AI correction recommended.")
            return result
        except Exception:
            return None

    @staticmethod
    def _extract_with_pypdf(path: Path) -> tuple[pd.DataFrame, str]:
        try:
            from pypdf import PdfReader
        except ModuleNotFoundError:
            return pd.DataFrame(), ""

        try:
            reader = PdfReader(str(path))
            text = "\n".join(page.extract_text() or "" for page in reader.pages[:3])
        except Exception:
            return pd.DataFrame(), ""

        rows = [line.strip() for line in text.splitlines() if line.strip()]
        if len(rows) < 2:
            return pd.DataFrame(), text

        table_rows = [DigitalPdfExtractor._split_pdf_line(row) for row in rows]
        table_rows = [row for row in table_rows if len(row) >= 2]
        if len(table_rows) < 2:
            return pd.DataFrame(), text

        header_index = DigitalPdfExtractor._header_index(table_rows)
        if header_index is None or header_index >= len(table_rows) - 1:
            return pd.DataFrame(), text

        headers = table_rows[header_index]
        data_rows = [row for row in table_rows[header_index + 1 :] if len(row) >= 2]
        width = len(headers)
        normalized_rows = []
        for row in data_rows:
            if len(row) < width:
                row = row + [None] * (width - len(row))
            elif len(row) > width:
                row = row[: width - 1] + [" ".join(str(cell) for cell in row[width - 1 :])]
            normalized_rows.append(row)

        if not normalized_rows:
            return pd.DataFrame(), text
        return pd.DataFrame(normalized_rows, columns=headers), text

    @staticmethod
    def _split_pdf_line(line: str) -> list[str]:
        if "\t" in line:
            return [part.strip() for part in line.split("\t") if part.strip()]
        spaced = re.split(r"\s{2,}", line)
        if len(spaced) >= 2:
            return [part.strip() for part in spaced if part.strip()]
        comma = [part.strip() for part in line.split(",") if part.strip()]
        if len(comma) >= 2:
            return comma
        return line.split()

    @staticmethod
    def _header_index(rows: list[list[str]]) -> int | None:
        header_tokens = {"emp", "employee", "client", "period", "working", "days", "ot", "hours"}
        best_index = None
        best_score = 0
        for index, row in enumerate(rows[:10]):
            tokens = set(" ".join(row).lower().replace("_", " ").split())
            score = len(tokens & header_tokens)
            if score > best_score:
                best_index = index
                best_score = score
        return best_index if best_score >= 2 else None

    @staticmethod
    def _extract_first_table(document: Any) -> pd.DataFrame:
        for table in getattr(document, "tables", []) or []:
            if hasattr(table, "export_to_dataframe"):
                dataframe = table.export_to_dataframe()
                if not dataframe.empty:
                    return dataframe
            if hasattr(table, "export_to_pandas"):
                dataframe = table.export_to_pandas()
                if not dataframe.empty:
                    return dataframe
            if hasattr(table, "data"):
                data = getattr(table, "data")
                rows = getattr(data, "table_cells", None) or getattr(data, "grid", None)
                if rows:
                    dataframe = pd.DataFrame(rows)
                    if not dataframe.empty:
                        return dataframe
        return pd.DataFrame()


class ScannedPdfExtractor(BaseExtractor):
    document_source = DocumentSource.PDF
    parser_name = "pdf_raster_ocr_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"PDF file not found: {path}")
        if path.suffix.lower() != ".pdf":
            raise ExtractionError("Scanned PDF extraction requires a PDF file. For images, upload with scanned=false.")

        image_path = render_pdf_first_page(path)
        result = ImageExtractor().extract(image_path)
        result.document_source = self.document_source
        result.parser_name = self.parser_name
        result.confidence = min(result.confidence, 0.7)
        result.metadata["source_path"] = str(path)
        result.metadata["rasterized_image_path"] = str(image_path)
        result.metadata["requires_ai_correction"] = True
        result.warnings.append("Scanned PDF OCR is error-prone; AI correction is recommended for this parser.")
        return result

