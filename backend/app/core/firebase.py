"""Firebase Admin SDK initialisation.

The Admin SDK is used only to verify Firebase ID tokens issued to frontend
users (and to set custom claims via scripts/set_user_claims.py). It needs a
service account key, configured via FIREBASE_SERVICE_ACCOUNT_FILE.
"""

from __future__ import annotations

from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from app.core.config import settings

_app: firebase_admin.App | None = None


class FirebaseNotConfiguredError(RuntimeError):
    pass


def _service_account_path() -> Path:
    path = Path(settings.FIREBASE_SERVICE_ACCOUNT_FILE)
    if not path.is_absolute():
        # Resolve relative to backend/ so it works regardless of CWD.
        path = Path(__file__).resolve().parents[2] / path
    return path


def get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    key_path = _service_account_path()
    if not key_path.exists():
        raise FirebaseNotConfiguredError(
            f"Firebase service account key not found at {key_path}. Download it from "
            "Firebase Console -> Project settings -> Service accounts -> Generate new "
            "private key, save it there (it is gitignored), or point "
            "FIREBASE_SERVICE_ACCOUNT_FILE at it. To run without auth locally set "
            "AUTH_ENABLED=false in backend/.env."
        )

    _app = firebase_admin.initialize_app(credentials.Certificate(str(key_path)))
    return _app


def firebase_configured() -> bool:
    return _service_account_path().exists()
