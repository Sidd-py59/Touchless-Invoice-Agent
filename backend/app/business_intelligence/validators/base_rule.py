from abc import ABC, abstractmethod
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult


class BaseRule(ABC):
    """
    Abstract validation rule for Layer 2.
    """

    @property
    @abstractmethod
    def rule_name(self) -> str:
        pass

    @abstractmethod
    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        """
        Executes validation check on the timesheet entry and returns a log row.
        """
        pass
