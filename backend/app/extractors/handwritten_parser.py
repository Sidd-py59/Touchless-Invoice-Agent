from __future__ import annotations

from pathlib import Path

from app.extractors.image_parser import ImageExtractor
from app.extractors.types import ExtractionResult
from app.models.document import DocumentSource


class HandwrittenExtractor(ImageExtractor):
    """OCR-first handwritten extraction.

    This intentionally performs local OCR only. The pipeline may apply an AI
    correction client after this step when one is configured.
    """

    document_source = DocumentSource.HANDWRITTEN
    parser_name = "paddleocr_handwritten_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        result = super().extract(path)
        result.document_source = self.document_source
        result.parser_name = self.parser_name
        result.confidence = min(result.confidence, 0.65)
        result.metadata["requires_ai_correction"] = True
        result.warnings.append("Handwritten OCR is error-prone; AI correction is recommended for this parser.")
        return result
