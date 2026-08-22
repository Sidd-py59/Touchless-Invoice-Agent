from __future__ import annotations

from pathlib import Path
import pandas as pd

from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


class ImageExtractor(BaseExtractor):
    document_source = DocumentSource.IMAGE
    parser_name = "paddleocr_image_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"Image file not found: {path}")

        try:
            from paddleocr import PaddleOCR
        except ModuleNotFoundError:
            raise ExtractionError("paddleocr is not installed")

        try:
            # Initialize PaddleOCR
            ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            result = ocr.ocr(str(path), cls=True)
            
            raw_text_lines = []
            if result and result[0]:
                # result[0] contains the list of text boxes for the first image
                for line in result[0]:
                    # line[1][0] is the text content
                    text = line[1][0]
                    raw_text_lines.append(text)
            
            ocr_text = "\n".join(raw_text_lines)
            
            if not ocr_text.strip():
                raise ExtractionError("PaddleOCR produced no text from the image.")

            return ExtractionResult(
                dataframe=pd.DataFrame(),
                confidence=0.75,
                document_source=self.document_source,
                parser_name=self.parser_name,
                metadata={
                    "source_path": str(path), 
                    "ocr_text": ocr_text, 
                    "requires_ai_correction": True
                },
                warnings=["Raw OCR text extracted; routed to AI correction for structuring."],
            )
        except Exception as exc:
            raise ExtractionError(f"PaddleOCR extraction failed: {exc}")
