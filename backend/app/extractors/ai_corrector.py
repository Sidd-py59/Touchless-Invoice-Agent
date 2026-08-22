from __future__ import annotations

from pathlib import Path
from typing import Protocol

import pandas as pd

from app.extractors.types import ExtractionResult


class TableCorrectionClient(Protocol):
    """Client interface for OCR/table correction models such as Grok Vision."""

    def correct_table(
        self,
        *,
        headers: list[str],
        rows: list[list[object]],
        ocr_text: str | None = None,
        image_path: Path | None = None,
        context: dict[str, object] | None = None,
    ) -> dict[str, object]:
        """Return {"headers": [...], "rows": [[...]], "confidence": 0.0-1.0, "notes": [...]}.

        Implementations must correct extraction/OCR structure only. They should
        not calculate pay, validate business rules, or approve the source data.
        """


class AITableCorrector:
    """Optional AI correction layer for scanned/handwritten extraction only."""

    def __init__(self, client: TableCorrectionClient | None = None) -> None:
        self.client = client

    @property
    def enabled(self) -> bool:
        return self.client is not None

    def correct(self, result: ExtractionResult) -> tuple[ExtractionResult, bool]:
        if self.client is None:
            return result, False

        clean = result.dataframe.where(pd.notnull(result.dataframe), None)
        source_path = result.metadata.get("source_path")
        image_path = None
        if source_path:
            p = Path(source_path)
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}:
                image_path = p
            elif "rasterized_image_path" in result.metadata:
                image_path = Path(result.metadata["rasterized_image_path"])

        payload = self.client.correct_table(
            headers=[str(column) for column in clean.columns],
            rows=clean.values.tolist(),
            ocr_text=result.metadata.get("ocr_text"),
            image_path=image_path,
            context={
                "parser_name": result.parser_name,
                "document_source": result.document_source.value,
                "warnings": result.warnings,
            },
        )

        headers = payload.get("headers") or list(clean.columns)
        rows = payload.get("rows") or clean.values.tolist()
        corrected = pd.DataFrame(rows, columns=headers)
        confidence = float(payload.get("confidence", result.confidence))

        result.dataframe = corrected
        result.confidence = max(result.confidence, confidence)
        result.verified_by_ai = True
        result.metadata["ai_corrected"] = True
        result.metadata["ai_correction_notes"] = payload.get("notes") or []
        return result, True
