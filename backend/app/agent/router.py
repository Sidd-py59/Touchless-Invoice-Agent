from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.schemas import AgentCommandRequest, AgentCommandResponse, VoicesResponse
from app.agent.service import FinanceAgentService
from app.agent.voice import KNOWN_VOICES
from app.core.config import settings
from app.db.session import get_db

router = APIRouter(prefix="/agent", tags=["finance-agent"])


@router.get("/voices", response_model=VoicesResponse)
async def list_voices() -> dict:
    return {"voices": KNOWN_VOICES, "default": settings.SMALLEST_VOICE_ID}


@router.post("/command", response_model=AgentCommandResponse)
async def run_agent_command(
    payload: AgentCommandRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await FinanceAgentService(db).handle(payload.text, voice_id=payload.voice_id)
