import mimetypes
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


class ImageParser(BaseParser):
    """
    Image parser driver.
    Bridges Layer 1 with the ExtractionPipeline, converting OCR outputs
    and applying LLM table correction before mapping to NormalizedDocument DTOs.
    """

    def supports(self, source_type: SourceType) -> bool:
        return source_type == SourceType.IMAGE

    async def parse(
        self,
        file_content: bytes,
        metadata: DocumentMetadata,
        handwritten: bool = False,
        **_: object,
    ) -> NormalizedDocument:
        suffix = self._suffix_for_mime(metadata.mime_type or metadata.file_name)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = Path(tmp.name)

        try:
            if settings.GROQ_API_KEY:
                client = GroqTableCorrectionClient(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_TABLE_CORRECTION_MODEL,
                    base_url=settings.GROQ_API_BASE_URL,
                    timeout_seconds=settings.GROQ_REQUEST_TIMEOUT_SECONDS,
                )
                pipeline = ExtractionPipeline(ai_corrector=AITableCorrector(client))
            else:
                pipeline = ExtractionPipeline()

            result = pipeline.extract(
                tmp_path, mime_type=metadata.mime_type, handwritten=handwritten
            )

            employees = []
            if not result.dataframe.empty:
                row_dicts = result.dataframe.to_dict(orient="records")
                SchemaMapper.apply_document_metadata(metadata, row_dicts)
                for row_dict in row_dicts:
                    if not any(str(val).strip() for val in row_dict.values() if val is not None):
                        continue
                    emp_rec = SchemaMapper.map_employee_row(row_dict, confidence=result.confidence)
                    if emp_rec.employee_code or emp_rec.employee_name:
                        employees.append(emp_rec)

            if not employees:
                raise ValueError("Image parser did not extract any employee rows.")

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

    @staticmethod
    def _suffix_for_mime(value: str | None) -> str:
        if not value:
            return ".jpeg"
        guessed = mimetypes.guess_extension(value)
        if guessed:
            return guessed
        suffix = Path(value).suffix
        return suffix if suffix else ".jpeg"