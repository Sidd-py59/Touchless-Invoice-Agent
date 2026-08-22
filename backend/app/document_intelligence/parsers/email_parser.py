import pandas as pd

from app.document_intelligence.classifiers.source_detector import SourceType
from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.normalized_document import NormalizedDocument
from app.document_intelligence.mapper.schema_mapper import SchemaMapper
from app.document_intelligence.parsers.base_parser import BaseParser
from app.extractors.email_parser import EmailBodyExtractor


class EmailParser(BaseParser):
    """
    Email document parser implementation.
    Reads email body text, extracts structured tabular content (Markdown/CSV/Key-Values),
    then normalizes headers and maps to unified NormalizedDocument DTO.
    """

    def supports(self, source_type: SourceType) -> bool:
        return source_type == SourceType.EMAIL

    async def parse(
        self, file_content: bytes, metadata: DocumentMetadata, **_: object
    ) -> NormalizedDocument:
        # Decode email body text from content bytes
        text = file_content.decode("utf-8", errors="replace")

        extractor = EmailBodyExtractor()
        result = extractor.extract_text(text)

        employees = []
        df_clean = result.dataframe.where(pd.notnull(result.dataframe), None)
        for _, row in df_clean.iterrows():
            employees.append(
                SchemaMapper.map_employee_row(row.to_dict(), confidence=result.confidence)
            )

        # Update metadata details
        metadata.parser = result.parser_name
        metadata.parser_version = "1.0.0"
        metadata.confidence = result.confidence
        metadata.warnings.extend(result.warnings)
        metadata.raw_text = text

        SchemaMapper.apply_document_metadata(metadata, df_clean.to_dict(orient="records"))

        return NormalizedDocument(
            metadata=metadata, employees=employees, reimbursements=[]
        )

