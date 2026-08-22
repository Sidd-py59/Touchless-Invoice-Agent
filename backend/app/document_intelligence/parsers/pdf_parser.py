import tempfile
from pathlib import Path

from app.core.config import settings
from app.document_intelligence.classifiers.source_detector import SourceType
from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.normalized_document import NormalizedDocument
from app.document_intelligence.mapper.schema_mapper import SchemaMapper
from app.document_intelligence.parsers.base_parser import BaseParser
from app.extractors.ai_corrector import AITableCorrector
from app.extractors.groq_corrector import GroqTableCorrectionClient
from app.extractors.pipeline import ExtractionPipeline
from app.extractors.types import ExtractionError, ExtractionResult


class PdfParser(BaseParser):
    """
    PDF parser driver.
    Runs digital PDF extraction first, then OCR fallback for scanned/image PDFs.
    """

    def supports(self, source_type: SourceType) -> bool:
        return source_type == SourceType.PDF

    async def parse(
        self,
        file_content: bytes,
        metadata: DocumentMetadata,
        scanned: bool = False,
        **_: object,
    ) -> NormalizedDocument:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_content)
            tmp_path = Path(tmp.name)

        try:
            pipeline = self._pipeline()
            result = self._extract_pdf(pipeline, tmp_path, scanned=scanned)
            employees = self._map_employees(result, metadata)

            if not employees:
                raise ExtractionError(
                    "PDF parser did not extract any employee rows. "
                    "Use a digital table PDF or a scanned PDF/image with readable table lines."
                )

            metadata.parser = result.parser_name or self.__class__.__name__
            metadata.parser_version = "1.1.0"
            metadata.warnings.extend(result.warnings)
            metadata.confidence = result.confidence

            if result.metadata.get("ai_corrected"):
                metadata.raw_text = f"AI Correction Notes: {result.metadata.get('ai_correction_notes', [])}"

            return NormalizedDocument(
                metadata=metadata, employees=employees, reimbursements=[]
            )
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    def _pipeline(self) -> ExtractionPipeline:
        if settings.GROQ_API_KEY:
            client = GroqTableCorrectionClient(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_TABLE_CORRECTION_MODEL,
                base_url=settings.GROQ_API_BASE_URL,
                timeout_seconds=settings.GROQ_REQUEST_TIMEOUT_SECONDS,
            )
            return ExtractionPipeline(ai_corrector=AITableCorrector(client))
        return ExtractionPipeline()

    def _extract_pdf(
        self, pipeline: ExtractionPipeline, path: Path, scanned: bool
    ) -> ExtractionResult:
        errors: list[str] = []

        if scanned:
            try:
                return pipeline.extract(path, mime_type="application/pdf", scanned=True)
            except Exception as exc:
                errors.append(f"scanned_pdf_ocr: {exc}")
        else:
            try:
                result = pipeline.extract(path, mime_type="application/pdf")
                if not result.dataframe.empty:
                    return result
                errors.append("digital_pdf: no table rows found")
            except Exception as exc:
                errors.append(f"digital_pdf: {exc}")

            try:
                result = pipeline.extract(path, mime_type="application/pdf", scanned=True)
                if not result.dataframe.empty:
                    result.warnings.append("Digital PDF parsing found no rows; OCR fallback was used.")
                    return result
                errors.append("scanned_pdf_ocr: no table rows found")
            except Exception as exc:
                errors.append(f"scanned_pdf_ocr: {exc}")

        raise ExtractionError("PDF extraction failed. " + " | ".join(errors))

    @staticmethod
    def _map_employees(result: ExtractionResult, metadata: DocumentMetadata):
        employees = []
        if result.dataframe.empty:
            return employees

        row_dicts = result.dataframe.to_dict(orient="records")
        SchemaMapper.apply_document_metadata(metadata, row_dicts)
        for row_dict in row_dicts:
            if not any(str(val).strip() for val in row_dict.values() if val is not None):
                continue
            emp_rec = SchemaMapper.map_employee_row(row_dict, confidence=result.confidence)
            if emp_rec.employee_code or emp_rec.employee_name:
                employees.append(emp_rec)
        return employees