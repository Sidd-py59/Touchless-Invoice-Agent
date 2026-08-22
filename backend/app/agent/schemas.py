from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentCommandRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    voice_id: str | None = Field(default=None, max_length=64)


class AgentCommandResponse(BaseModel):
    intent: str
    status: str
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    audio_url: str | None = None
    audio_status: str = "disabled"
    voice_provider: str | None = None
    voice_error: str | None = None


class VoicesResponse(BaseModel):
    voices: list[str]
    default: str
