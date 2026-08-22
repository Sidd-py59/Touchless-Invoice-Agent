"""HTTP hardening middleware and upload validation.

Defense-in-depth on top of Firebase token auth (app/core/auth.py):
  - SecurityHeadersMiddleware: browser-side protections on every response
  - RateLimitMiddleware:       per-IP sliding-window request budget
  - BodySizeLimitMiddleware:   reject oversized request bodies up front
  - StorageAuthMiddleware:     the /storage file mount (uploaded payroll files,
                               voice audio) requires an admin token
  - validate_upload():         extension allowlist + size cap for file uploads
"""

from __future__ import annotations

import time
from collections import deque
from pathlib import Path

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.core.config import settings

# File types the parsing pipeline actually understands: spreadsheets, PDFs,
# and scanned/photographed timesheets.
ALLOWED_UPLOAD_EXTENSIONS = {
    ".xlsx", ".xls", ".xlsm", ".csv",
    ".pdf",
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff",
}


def validate_upload(filename: str | None, contents: bytes) -> None:
    """Raise 4xx for uploads the pipeline should never accept."""
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_MB} MB.",
        )
    ext = Path(filename or "").suffix.lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext or 'none'}'. Allowed: {allowed}",
        )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        # Effective once deployed behind TLS; harmless over plain HTTP.
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        if request.url.path.startswith(settings.API_V1_STR):
            # Financial data must never land in shared/browser caches, and API
            # responses are pure data — forbid any embedded content execution.
            response.headers.setdefault("Cache-Control", "no-store")
            response.headers.setdefault("Content-Security-Policy", "default-src 'none'")
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding one-minute window per client IP, in-memory.

    Sized for a single-process deployment; a multi-worker production setup
    should rate-limit at the reverse proxy instead.
    """

    def __init__(self, app, limit_per_minute: int) -> None:
        super().__init__(app)
        self.limit = limit_per_minute
        self.buckets: dict[str, deque[float]] = {}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path == "/health":
            return await call_next(request)

        now = time.monotonic()
        ip = request.client.host if request.client else "unknown"
        bucket = self.buckets.setdefault(ip, deque())
        while bucket and now - bucket[0] > 60:
            bucket.popleft()

        if len(bucket) >= self.limit:
            retry_after = max(1, int(61 - (now - bucket[0])))
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Slow down and retry shortly."},
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)

        # Keep memory bounded if many distinct IPs hit the service.
        if len(self.buckets) > 10_000:
            self.buckets = {k: v for k, v in self.buckets.items() if v}

        return await call_next(request)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        length = request.headers.get("content-length")
        if length is not None:
            try:
                if int(length) > settings.MAX_UPLOAD_MB * 1024 * 1024:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request body too large (max {settings.MAX_UPLOAD_MB} MB)."},
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})
        return await call_next(request)


class StorageAuthMiddleware(BaseHTTPMiddleware):
    """The /storage static mount serves uploaded payroll files and generated
    voice audio — back-office data. Require an admin Firebase token (header or
    ?token= for <audio>/<a> elements that cannot send headers)."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path.startswith("/storage"):
            from app.core.auth import get_current_user

            try:
                user = await get_current_user(request)
            except HTTPException as exc:
                return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
            if user.get("role") != "admin":
                return JSONResponse(status_code=403, content={"detail": "Admin access required"})
        return await call_next(request)
