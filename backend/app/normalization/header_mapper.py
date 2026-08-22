from __future__ import annotations

import re
from collections.abc import Callable

import pandas as pd

from app.normalization.mapping_dictionary import HEADER_MAPPING


SemanticMapper = Callable[[str], str | None]


class HeaderMapper:
    """Normalize source headers into canonical snake_case names."""

    def __init__(self, semantic_mapper: SemanticMapper | None = None) -> None:
        self.semantic_mapper = semantic_mapper
        self.learned_mappings: dict[str, str] = {}

    def normalize(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        renamed: dict[object, str] = {}
        used: set[str] = set()

        for column in dataframe.columns:
            canonical = self.map_header(str(column))
            canonical = self._dedupe(canonical, used)
            used.add(canonical)
            renamed[column] = canonical

        return dataframe.rename(columns=renamed)

    def map_header(self, header: str) -> str:
        normalized = self._normalize_key(header)
        if normalized in self.learned_mappings:
            return self.learned_mappings[normalized]
        if normalized in HEADER_MAPPING:
            mapped = HEADER_MAPPING[normalized]
            self.learned_mappings[normalized] = mapped
            return mapped
        if self.semantic_mapper is not None:
            mapped = self.semantic_mapper(header)
            if mapped:
                self.learned_mappings[normalized] = mapped
                return mapped
        mapped = self._snake_case(header)
        self.learned_mappings[normalized] = mapped
        return mapped

    @staticmethod
    def _normalize_key(value: str) -> str:
        value = value.strip().lower()
        value = re.sub(r"[_\-]+", " ", value)
        value = re.sub(r"\s+", " ", value)
        return value

    @staticmethod
    def _snake_case(value: str) -> str:
        value = value.strip().lower()
        value = re.sub(r"[^a-z0-9]+", "_", value)
        value = re.sub(r"_+", "_", value).strip("_")
        return value or "unnamed_column"

    @staticmethod
    def _dedupe(value: str, used: set[str]) -> str:
        if value not in used:
            return value
        index = 2
        candidate = f"{value}_{index}"
        while candidate in used:
            index += 1
            candidate = f"{value}_{index}"
        return candidate
