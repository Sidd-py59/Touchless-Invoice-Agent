from abc import ABC, abstractmethod
from app.schemas.parser import NormalizedDocumentDTO


class BaseParser(ABC):
    """
    Abstract Base Class for all TIA parsers.
    Defines the contract for transforming unstructured/structured files
    into a common NormalizedDocumentDTO.
    """

    @abstractmethod
    def parse(self, file_content: bytes, **kwargs) -> NormalizedDocumentDTO:
        """
        Parses a file from its raw bytes and returns a NormalizedDocumentDTO.

        Args:
            file_content (bytes): Raw bytes of the uploaded file.
            **kwargs: Dynamic arguments (e.g., client context, billing month, etc.)

        Returns:
            NormalizedDocumentDTO: Clean parsed data and DTO representation.
        """
        pass
