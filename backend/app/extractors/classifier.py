from __future__ import annotations

import mimetypes
from pathlib import Path

from app.models.document import DocumentSource


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
EXCEL_EXTENSIONS = {".xlsx", ".xls", ".xlsm", ".csv"}
PDF_EXTENSIONS = {".pdf"}


class FileClassifier:
    """Lightweight deterministic file classifier."""

    name = "extension_mime_classifier_v1"

    def classify(self, path: Path, mime_type: str | None = None, handwritten: bool = False) -> DocumentSource:
        suffix = path.suffix.lower()
        guessed_mime = mime_type or mimetypes.guess_type(path.name)[0] or ""

        if handwritten and suffix in IMAGE_EXTENSIONS | PDF_EXTENSIONS:
            return DocumentSource.HANDWRITTEN
        if suffix in EXCEL_EXTENSIONS:
            return DocumentSource.EXCEL
        if suffix in PDF_EXTENSIONS or "pdf" in guessed_mime:
            return DocumentSource.PDF
        if suffix in IMAGE_EXTENSIONS:
            return DocumentSource.IMAGE
        return DocumentSource.PORTAL
