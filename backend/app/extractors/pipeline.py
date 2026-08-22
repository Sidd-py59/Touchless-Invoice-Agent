from __future__ import annotations

from pathlib import Path

from app.extractors.ai_corrector import AITableCorrector
from app.extractors.classifier import FileClassifier
from app.extractors.email_parser import EmailBodyExtractor
from app.extractors.excel_parser import ExcelExtractor
from app.extractors.handwritten_parser import HandwrittenExtractor
from app.extractors.image_parser import ImageExtractor
from app.extractors.pdf_parser import DigitalPdfExtractor, ScannedPdfExtractor
from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource
from app.normalization.dataframe_cleaner import DataFrameCleaner
from app.normalization.header_mapper import HeaderMapper


class ExtractionPipeline:
    """Document -> parser -> optional OCR AI correction -> header mapping -> DataFrame."""

    def __init__(
        self,
        classifier: FileClassifier | None = None,
        ai_corrector: AITableCorrector | None = None,
        header_mapper: HeaderMapper | None = None,
        cleaner: DataFrameCleaner | None = None,
        confidence_threshold: float = 0.95,
    ) -> None:
        self.classifier = classifier or FileClassifier()
        self.ai_corrector = ai_corrector or AITableCorrector()
        self.header_mapper = header_mapper or HeaderMapper()
        self.cleaner = cleaner or DataFrameCleaner()
        self.confidence_threshold = confidence_threshold
        self.email_extractor = EmailBodyExtractor()
        self.scanned_pdf_extractor = ScannedPdfExtractor()
        self.extractors: dict[DocumentSource, BaseExtractor] = {
            DocumentSource.EXCEL: ExcelExtractor(),
            DocumentSource.PDF: DigitalPdfExtractor(),
            DocumentSource.IMAGE: ImageExtractor(),
            DocumentSource.HANDWRITTEN: HandwrittenExtractor(),
        }

    def extract(
        self,
        path: Path,
        mime_type: str | None = None,
        handwritten: bool = False,
        scanned: bool = False,
    ) -> ExtractionResult:
        if scanned:
            result = self.scanned_pdf_extractor.extract(path)
            result.metadata["classifier_name"] = "explicit_scanned_pdf_route"
            return self._post_process(result)

        document_source = self.classifier.classify(path, mime_type=mime_type, handwritten=handwritten)
        extractor = self.extractors.get(document_source)
        if extractor is None:
            raise ExtractionError(f"Unsupported document type for path: {path}")

        result = extractor.extract(path)
        result.metadata["classifier_name"] = self.classifier.name
        return self._post_process(result)

    def extract_email_body(self, text: str) -> ExtractionResult:
        result = self.email_extractor.extract_text(text)
        result.metadata["classifier_name"] = "email_body"
        return self._post_process(result, allow_ai_correction=False)

    def _post_process(self, result: ExtractionResult, allow_ai_correction: bool = True) -> ExtractionResult:
        result.metadata["confidence_threshold"] = self.confidence_threshold

        if allow_ai_correction and self._should_apply_ai_correction(result):
            try:
                result, corrected = self.ai_corrector.correct(result)
            except ExtractionError as exc:
                corrected = False
                result.metadata["ai_correction_error"] = str(exc)
                result.warnings.append("AI correction failed; returning OCR output for review.")
            if not corrected and "ai_correction_error" not in result.metadata:
                result.metadata["ai_correction_skipped"] = "no_table_correction_client_configured"

        result.dataframe = self.header_mapper.normalize(result.dataframe)
        result.dataframe = self.cleaner.clean(result.dataframe)
        return result

    def _should_apply_ai_correction(self, result: ExtractionResult) -> bool:
        if result.metadata.get("requires_ai_correction"):
            return True
        if result.document_source in {DocumentSource.HANDWRITTEN, DocumentSource.IMAGE, DocumentSource.PDF}:
            return result.confidence < self.confidence_threshold and "ocr_text" in result.metadata
        return False
