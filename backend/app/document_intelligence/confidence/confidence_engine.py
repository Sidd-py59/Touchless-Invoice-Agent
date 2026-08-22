from app.document_intelligence.classifiers.source_detector import SourceType


class ConfidenceEngine:
    """
    Confidence Calculation Engine.
    Calculates overall extraction reliability scores.
    """

    @staticmethod
    def calculate_confidence(source_type: SourceType, **kwargs) -> float:
        """
        Computes the extraction confidence score.
        Digital files (e.g. Excel) default to 1.0. OCR or email parsed contents
        will evaluate character probabilities in future releases.
        """
        if source_type == SourceType.EXCEL:
            return 1.0

        # OCR/Image parser default fallback if unanalyzed
        return 0.80
