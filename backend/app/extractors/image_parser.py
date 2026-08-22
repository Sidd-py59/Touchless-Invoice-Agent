from __future__ import annotations

from pathlib import Path
from statistics import median
from typing import Any

import pandas as pd

from app.extractors.types import BaseExtractor, ExtractionError, ExtractionResult
from app.models.document import DocumentSource


class ImageExtractor(BaseExtractor):
    document_source = DocumentSource.IMAGE
    parser_name = "rapidocr_image_table_parser_v1"

    def extract(self, path: Path) -> ExtractionResult:
        if not path.exists():
            raise ExtractionError(f"Image file not found: {path}")

        dataframe, text, confidence, parser_name = self._extract_with_rapidocr(path)
        if dataframe.empty:
            dataframe, text, confidence, parser_name = self._extract_with_tesseract(path)
        if dataframe.empty:
            raise ExtractionError("OCR produced no table-like rows")

        return ExtractionResult(
            dataframe=dataframe,
            confidence=confidence,
            document_source=self.document_source,
            parser_name=parser_name,
            metadata={"source_path": str(path), "ocr_text": text, "requires_ai_correction": True},
            warnings=["OCR confidence is approximate; route to AI correction when below threshold."],
        )

    @staticmethod
    def _extract_with_rapidocr(path: Path) -> tuple[pd.DataFrame, str, float, str]:
        try:
            from rapidocr import RapidOCR
        except ModuleNotFoundError:
            return pd.DataFrame(), "", 0.0, "rapidocr_image_table_parser_v1"

        result = RapidOCR()(path)
        raw_txts = getattr(result, "txts", None)
        raw_boxes = getattr(result, "boxes", None)
        raw_scores = getattr(result, "scores", None)
        txts = list(raw_txts) if raw_txts is not None else []
        boxes = list(raw_boxes) if raw_boxes is not None else []
        scores = list(raw_scores) if raw_scores is not None else []
        if not txts or not boxes:
            return pd.DataFrame(), "", 0.0, "rapidocr_image_table_parser_v1"

        cells: list[dict[str, Any]] = []
        for index, text in enumerate(txts):
            box = boxes[index]
            score = float(scores[index]) if index < len(scores) else 0.75
            xs = [float(point[0]) for point in box]
            ys = [float(point[1]) for point in box]
            cells.append(
                {
                    "text": str(text).strip(),
                    "x": sum(xs) / len(xs),
                    "y": sum(ys) / len(ys),
                    "height": max(ys) - min(ys),
                    "score": score,
                }
            )

        rows = ImageExtractor._group_cells_by_row(cells)
        dataframe = ImageExtractor._rows_to_dataframe(rows)
        ocr_text = "\n".join(" | ".join(cell["text"] for cell in row) for row in rows)
        ocr_confidence = sum(cell["score"] for cell in cells) / len(cells)
        confidence = min(ocr_confidence, 0.9)
        return dataframe, ocr_text, confidence, "rapidocr_image_table_parser_v1"

    @staticmethod
    def _extract_with_tesseract(path: Path) -> tuple[pd.DataFrame, str, float, str]:
        try:
            import cv2
            import pytesseract
        except ModuleNotFoundError:
            return pd.DataFrame(), "", 0.0, "opencv_tesseract_image_table_parser_v1"

        image = cv2.imread(str(path))
        if image is None:
            raise ExtractionError(f"Could not read image: {path}")

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        gray = cv2.equalizeHist(gray)

        text = pytesseract.image_to_string(gray, config="--oem 3 --psm 6")
        dataframe = ImageExtractor._text_to_dataframe(text)
        return dataframe, text, 0.75, "opencv_tesseract_image_table_parser_v1"

    @staticmethod
    def _group_cells_by_row(cells: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
        if not cells:
            return []

        heights = [cell["height"] for cell in cells if cell["height"] > 0]
        threshold = max(10.0, median(heights) * 0.75 if heights else 10.0)
        rows: list[dict[str, Any]] = []

        for cell in sorted(cells, key=lambda item: (item["y"], item["x"])):
            best_row = None
            best_distance = None
            for row in rows:
                distance = abs(cell["y"] - row["y"])
                if distance <= threshold and (best_distance is None or distance < best_distance):
                    best_row = row
                    best_distance = distance
            if best_row is None:
                rows.append({"y": cell["y"], "cells": [cell]})
                continue
            best_row["cells"].append(cell)
            best_row["y"] = sum(item["y"] for item in best_row["cells"]) / len(best_row["cells"])

        return [sorted(row["cells"], key=lambda item: item["x"]) for row in sorted(rows, key=lambda item: item["y"])]

    @staticmethod
    def _rows_to_dataframe(rows: list[list[dict[str, Any]]]) -> pd.DataFrame:
        if len(rows) < 2:
            return pd.DataFrame()

        header_index = ImageExtractor._header_index(rows)
        if header_index is None or header_index >= len(rows) - 1:
            return pd.DataFrame()

        header_cells = ImageExtractor._merge_split_headers(rows[header_index])
        headers = [cell["text"] for cell in header_cells]
        header_x = [cell["x"] for cell in header_cells]
        records: list[dict[str, str]] = []

        for row in rows[header_index + 1 :]:
            record = {header: "" for header in headers}
            for cell in row:
                column_index = ImageExtractor._nearest_column(cell["x"], header_x)
                header = headers[column_index]
                record[header] = f"{record[header]} {cell['text']}".strip() if record[header] else cell["text"]
            if any(value.strip() for value in record.values()):
                records.append(record)

        return pd.DataFrame(records, columns=headers)

    @staticmethod
    def _merge_split_headers(header_cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        cells = sorted(header_cells, key=lambda item: (item["x"], item["y"]))
        index = 0
        while index < len(cells):
            current = dict(cells[index])
            next_cell = cells[index + 1] if index + 1 < len(cells) else None
            if (
                next_cell is not None
                and current["text"].strip().lower() == "ot"
                and next_cell["text"].strip().lower() == "amount"
                and abs(float(current["x"]) - float(next_cell["x"])) <= 40
            ):
                current["text"] = "OT Amount"
                current["x"] = (float(current["x"]) + float(next_cell["x"])) / 2
                merged.append(current)
                index += 2
                continue
            merged.append(current)
            index += 1
        return sorted(merged, key=lambda item: item["x"])

    @staticmethod
    def _header_index(rows: list[list[dict[str, Any]]]) -> int | None:
        tokens = {"emp", "employee", "client", "period", "working", "days", "ot", "hours", "gross", "net"}
        best_index = None
        best_score = 0
        for index, row in enumerate(rows[:8]):
            text = " ".join(cell["text"] for cell in row).lower().replace("_", " ")
            row_tokens = set(text.split())
            score = len(row_tokens & tokens)
            if score > best_score:
                best_index = index
                best_score = score
        return best_index if best_score >= 2 else None

    @staticmethod
    def _nearest_column(x: float, header_x: list[float]) -> int:
        return min(range(len(header_x)), key=lambda index: abs(x - header_x[index]))

    @staticmethod
    def _text_to_dataframe(text: str) -> pd.DataFrame:
        rows = [line.strip() for line in text.splitlines() if line.strip()]
        split_rows = [row.split() for row in rows]
        if len(split_rows) < 2:
            return pd.DataFrame()
        width = max(len(row) for row in split_rows)
        normalized = [row + [None] * (width - len(row)) for row in split_rows]
        return pd.DataFrame(normalized[1:], columns=normalized[0])
