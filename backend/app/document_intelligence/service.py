from typing import List, Optional

from app.document_intelligence.classifiers.source_detector import SourceDetector, SourceType
from app.document_intelligence.confidence.confidence_engine import ConfidenceEngine
from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.normalized_document import NormalizedDocument
from app.document_intelligence.parsers.base_parser import BaseParser
from app.document_intelligence.parsers.email_parser import EmailParser
from app.document_intelligence.parsers.excel_parser import ExcelParser
from app.document_intelligence.parsers.image_parser import ImageParser
from app.document_intelligence.parsers.pdf_parser import PdfParser


class DocumentIntelligenceService:
    """
    Document Intelligence Service.
    Acts as the single entry point for Layer 1. Coordinates source detection,
    parser matching, parsing, and confidence calculation.
    """

    def __init__(self, parsers: Optional[List[BaseParser]] = None):
        # Register standard parsing drivers
        self.parsers = parsers or [
            ExcelParser(),
            PdfParser(),
            ImageParser(),
            EmailParser(),
        ]

    async def ingest_document(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        client_name: Optional[str] = None,
        billing_month: Optional[str] = None,
        **kwargs
    ) -> NormalizedDocument:
        """
        Receives document bytes and characteristics, executes detection and parsing,
        and returns a unified database-free NormalizedDocument DTO.
        """
        # 1. Source Classification
        source_type = SourceDetector.detect_source(file_name, mime_type)
        if source_type == SourceType.UNKNOWN:
            raise ValueError(
                f"Unsupported file type. Unable to classify source for: {file_name}"
            )

        # 2. Initialize metadata DTO
        metadata = DocumentMetadata(
            source=source_type.value,
            parser="None",
            parser_version="0.0.0",
            file_name=file_name,
            mime_type=mime_type,
            client_name=client_name,
            billing_month=billing_month,
        )

        # 3. Locate Parser driver
        selected_parser: Optional[BaseParser] = None
        for parser in self.parsers:
            if parser.supports(source_type):
                selected_parser = parser
                break

        if not selected_parser:
            raise ValueError(
                f"No matching parser registered for source type: {source_type.value}"
            )

        # 4. Parse content (modifies metadata logs and maps to unified structures)
        normalized_doc = await selected_parser.parse(file_content, metadata, **kwargs)

        # 5. Populate and evaluate overall confidence ratings
        overall_confidence = ConfidenceEngine.calculate_confidence(source_type)
        normalized_doc.metadata.confidence = overall_confidence

        return normalized_doc
