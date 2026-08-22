from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from app.models.document import DocumentSource


class ExtractionError(RuntimeError):
    """Raised when a parser cannot produce a DataFrame."""


@dataclass(slots=True)
class ExtractionResult:
    dataframe: pd.DataFrame
    confidence: float
    document_source: DocumentSource
    parser_name: str
    metadata: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    verified_by_ai: bool = False

    @property
    def needs_review(self) -> bool:
        return self.confidence < float(self.metadata.get("confidence_threshold", 0.95))

    def to_table_payload(self) -> dict[str, Any]:
        frame = self.dataframe.where(pd.notnull(self.dataframe), None)
        return {
            "headers": [str(column) for column in frame.columns],
            "rows": frame.values.tolist(),
            "confidence": self.confidence,
            "document_source": self.document_source.value,
            "parser_name": self.parser_name,
            "metadata": self.metadata,
            "warnings": self.warnings,
            "verified_by_ai": self.verified_by_ai,
            "needs_review": self.needs_review,
        }


class BaseExtractor:
    document_source: DocumentSource
    parser_name: str

    def extract(self, path: Path) -> ExtractionResult:
        raise NotImplementedError
