import enum
from pathlib import Path


class SourceType(str, enum.Enum):
    EXCEL = "excel"
    PDF = "pdf"
    IMAGE = "image"
    EMAIL = "email"
    UNKNOWN = "unknown"


class SourceDetector:
    """
    Incurs source categorization from file names and MIME content labels.
    """

    @staticmethod
    def detect_source(file_name: str, mime_type: str) -> SourceType:
        """
        Determines the SourceType by matching file extension and MIME type.
        """
        name_lower = file_name.strip().lower()
        mime_lower = mime_type.strip().lower()

        # Match by extension
        ext = Path(name_lower).suffix
        if ext in (".xlsx", ".xls", ".csv"):
            return SourceType.EXCEL
        if ext == ".pdf":
            return SourceType.PDF
        if ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"):
            return SourceType.IMAGE
        if ext in (".eml", ".msg"):
            return SourceType.EMAIL

        # Fallback to MIME type prefix matches
        if "spreadsheet" in mime_lower or "excel" in mime_lower or "ms-excel" in mime_lower or "csv" in mime_lower:
            return SourceType.EXCEL
        if "pdf" in mime_lower:
            return SourceType.PDF
        if mime_lower.startswith("image/"):
            return SourceType.IMAGE
        if "rfc822" in mime_lower or "outlook" in mime_lower or "email" in mime_lower:
            return SourceType.EMAIL

        return SourceType.UNKNOWN
