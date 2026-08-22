"""Request authentication/authorisation dependencies backed by Firebase Auth.

Frontend users sign in with Firebase (email/password or Google) and send their
ID token as `Authorization: Bearer <token>`. Download links opened as plain
anchors cannot carry headers, so a `?token=` query parameter is also accepted.

Roles are Firebase custom claims set with scripts/set_user_claims.py:
    role: "admin" | "client"
    client_id: <int>   (required for client users; scopes the portal)
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Request, status
from firebase_admin import auth as firebase_auth

from app.core.config import settings
from app.core.firebase import FirebaseNotConfiguredError, get_firebase_app

# Stand-in identity when AUTH_ENABLED=false (local development only).
_DEV_USER: dict[str, Any] = {"uid": "dev", "email": "dev@localhost", "role": "admin"}


def _extract_token(request: Request) -> str | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header.removeprefix("Bearer ").strip() or None
    return request.query_params.get("token") or None


async def get_current_user(request: Request) -> dict[str, Any]:
    """Verify the Firebase ID token and return its decoded claims."""
    if not settings.AUTH_ENABLED:
        return _DEV_USER

    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        get_firebase_app()
        return firebase_auth.verify_id_token(token)
    except FirebaseNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def require_admin(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_portal_access(
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Allow admins everywhere; lock client users to their own {client_id} routes."""
    if user.get("role") == "admin":
        return user

    if user.get("role") != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No role assigned to this account yet. Ask an administrator to grant access.",
        )

    path_client_id = request.path_params.get("client_id")
    claim_client_id = user.get("client_id")
    if path_client_id is None or claim_client_id is None or str(claim_client_id) != str(path_client_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this client's data",
        )
    return user
