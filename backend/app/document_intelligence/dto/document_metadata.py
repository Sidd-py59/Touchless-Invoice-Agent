from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    """
    Metadata associated with the parsed document, including parsing logs,
    detected client context, and warnings.
    """

    source: str  # Detected source type (e.g. EXCEL, PDF, IMAGE, EMAIL)
    parser: str  # Name of the parser that processed the file
    parser_version: str  # Version of the parser
    file_name: str
    mime_type: str
    billing_month: str | None = None  # Expected billing month, e.g. "2026-06"
    client_name: str | None = None
    client_code: str | None = None
    confidence: float = 1.0  # Overall extraction confidence score
    raw_text: str | None = None  # Cleaned raw text dump of the document if available
    warnings: list[str] = Field(default_factory=list)  # Any non-blocking parser warnings
