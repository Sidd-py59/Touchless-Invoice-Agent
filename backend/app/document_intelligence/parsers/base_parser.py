from abc import ABC, abstractmethod

from app.document_intelligence.classifiers.source_detector import SourceType
from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.normalized_document import NormalizedDocument


class BaseParser(ABC):
    """
    Abstract Base Class representing a pure document parser.
    Implementations must perform formatting and extraction without executing database commands.
    """

    @abstractmethod
    def supports(self, source_type: SourceType) -> bool:
        """
        Returns True if the parser supports the given SourceType.
        """
        pass

    @abstractmethod
    async def parse(
        self, file_content: bytes, metadata: DocumentMetadata
    ) -> NormalizedDocument:
        """
        Parses document raw bytes and populates a NormalizedDocument.
        """
        pass
