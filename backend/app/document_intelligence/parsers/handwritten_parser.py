from app.document_intelligence.classifiers.source_detector import SourceType
from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.normalized_document import NormalizedDocument
from app.document_intelligence.parsers.base_parser import BaseParser


class HandwrittenParser(BaseParser):
    """
    Stub implementation for future Handwritten document parsing support.
    """

    def supports(self, source_type: SourceType) -> bool:
        # Handwritten forms are scanned as images or PDFs.
        # We will detect handwritten profiles or flag it.
        return False

    async def parse(
        self, file_content: bytes, metadata: DocumentMetadata
    ) -> NormalizedDocument:
        metadata.warnings.append("Handwritten parsing is not yet implemented.")
        return NormalizedDocument(metadata=metadata, employees=[], reimbursements=[])
