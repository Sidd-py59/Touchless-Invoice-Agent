from __future__ import annotations

import asyncio
import hashlib
import json
import re
from pathlib import Path
from typing import Any
from urllib import error, request

from app.core.config import settings

KNOWN_VOICES: list[str] = ["jessica", "rachel", "david", "alex", "noah", "john"]


class SmallestVoiceService:
    """Optional Smallest.ai TTS adapter for finance agent responses."""

    def __init__(self) -> None:
        self.output_dir = self._resolve_output_dir(settings.SMALLEST_AUDIO_OUTPUT_DIR)

    def _resolve_output_dir(self, configured_path: str) -> Path:
        path = Path(configured_path)
        if path.is_absolute():
            return path
        backend_root = Path(__file__).resolve().parents[2]
        return backend_root / path

    async def synthesize_response(
        self, text: str, *, intent: str, voice_id: str | None = None
    ) -> dict[str, Any]:
        if not settings.SMALLEST_API_KEY:
            return {
                "audio_url": None,
                "audio_status": "disabled",
                "voice_provider": "smallest.ai",
                "voice_error": "SMALLEST_API_KEY is not configured.",
            }

        if not text.strip():
            return {
                "audio_url": None,
                "audio_status": "skipped",
                "voice_provider": "smallest.ai",
                "voice_error": "No response text to synthesize.",
            }

        effective_voice = voice_id or settings.SMALLEST_VOICE_ID

        try:
            path = await asyncio.to_thread(self._request_audio, text, intent, effective_voice)
        except Exception as exc:
            return {
                "audio_url": None,
                "audio_status": "failed",
                "voice_provider": "smallest.ai",
                "voice_error": str(exc),
            }

        return {
            "audio_url": f"/storage/voice/{path.name}",
            "audio_status": "generated",
            "voice_provider": "smallest.ai",
            "voice_error": None,
        }

    def _request_audio(self, text: str, intent: str, voice_id: str) -> Path:
        self.output_dir.mkdir(parents=True, exist_ok=True)

        safe_intent = re.sub(r"[^a-zA-Z0-9_-]+", "_", intent).strip("_") or "agent"
        content_key = f"{voice_id}:{intent}:{text}"
        digest = hashlib.sha256(content_key.encode("utf-8")).hexdigest()[:16]
        suffix = self._audio_suffix()
        output_path = self.output_dir / f"{safe_intent}_{digest}{suffix}"

        if output_path.exists():
            return output_path

        payload = {
            "text": text,
            "voice_id": voice_id,
            "sample_rate": settings.SMALLEST_SAMPLE_RATE,
            "output_format": settings.SMALLEST_OUTPUT_FORMAT,
        }
        encoded = json.dumps(payload).encode("utf-8")
        req = request.Request(
            settings.SMALLEST_TTS_URL,
            data=encoded,
            method="POST",
            headers={
                "Authorization": f"Bearer {settings.SMALLEST_API_KEY}",
                "Content-Type": "application/json",
                "Accept": self._accept_header(),
            },
        )

        try:
            with request.urlopen(req, timeout=settings.SMALLEST_REQUEST_TIMEOUT_SECONDS) as response:
                audio_bytes = response.read()
                content_type = response.headers.get("content-type", "")
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Smallest.ai TTS failed with HTTP {exc.code}: {body}") from exc
        except error.URLError as exc:
            raise RuntimeError(f"Smallest.ai TTS request failed: {exc.reason}") from exc

        if not audio_bytes:
            raise RuntimeError("Smallest.ai TTS returned an empty audio response.")
        if "json" in content_type.lower():
            raise RuntimeError(audio_bytes.decode("utf-8", errors="replace"))

        output_path.write_bytes(audio_bytes)
        return output_path

    def _audio_suffix(self) -> str:
        output_format = settings.SMALLEST_OUTPUT_FORMAT.lower().strip(".")
        if output_format in {"wav", "mp3", "aac", "flac"}:
            return f".{output_format}"
        return ".mp3"

    def _accept_header(self) -> str:
        suffix = self._audio_suffix().lstrip(".")
        if suffix == "wav":
            return "audio/wav"
        if suffix == "mp3":
            return "audio/mpeg"
        return f"audio/{suffix}"
