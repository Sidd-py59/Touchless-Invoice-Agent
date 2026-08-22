"""Create Firebase accounts for the demo companies and wire them to TIA clients.

For each company below this script:
  1. derives its login email  — company name lowercased, spaces/punctuation and
     legal suffixes (LLC/PJSC/FZE) dropped, plus ".tia@test.com"
  2. creates (or updates) the Firebase user with password = email
  3. sets custom claims  role=client, client_id=<TIA client id>  so the portal
     and API only ever show that company's own invoices/documents
  4. stores the email on the client row so invoice dispatch targets it

Also creates the back-office account admin.tia@test.com (role=admin).

Run from backend/ (needs serviceAccountKey.json):
    uv run python scripts/seed_client_accounts.py
"""

from __future__ import annotations

import re
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firebase_admin import auth as firebase_auth

from app.core.firebase import get_firebase_app

COMPANIES = [
    "Emirates Steel Industries LLC",
    "Emaar Properties PJSC",
    "Dubai Airports FZE",
    "ADNOC Distribution PJSC",
    "Majid Al Futtaim Retail LLC",
    "Abu Dhabi Commercial Bank PJSC",
    "DP World FZE",
    "Etihad Airways PJSC",
    "Aldar Properties PJSC",
    "Transguard Group LLC",
]

ADMIN_EMAIL = "admin.tia@test.com"
LEGAL_SUFFIXES = {"llc", "pjsc", "fze"}


def company_email(name: str) -> str:
    tokens = re.findall(r"[a-z0-9]+", name.lower())
    while tokens and tokens[-1] in LEGAL_SUFFIXES:
        tokens.pop()
    return "".join(tokens) + ".tia@test.com"


def ensure_user(email: str, claims: dict[str, object]) -> str:
    """Create the user (password = email) or reset it if it already exists."""
    try:
        user = firebase_auth.get_user_by_email(email)
        firebase_auth.update_user(user.uid, password=email)
        action = "updated"
    except firebase_auth.UserNotFoundError:
        user = firebase_auth.create_user(email=email, password=email, email_verified=True)
        action = "created"
    firebase_auth.set_custom_user_claims(user.uid, claims)
    print(f"  {action}: {email}  claims={claims}")
    return user.uid


def main() -> int:
    get_firebase_app()
    db = sqlite3.connect(Path(__file__).resolve().parents[1] / "tia.db")

    print("Client accounts:")
    seeded: list[tuple[int, str, str]] = []
    for name in COMPANIES:
        row = db.execute(
            "SELECT id FROM clients WHERE lower(name) = lower(?)", (name,)
        ).fetchone()
        if row is None:
            print(f"  SKIPPED (no client row in DB): {name}")
            continue
        client_id = int(row[0])
        email = company_email(name)
        ensure_user(email, {"role": "client", "client_id": client_id})
        db.execute("UPDATE clients SET email = ? WHERE id = ?", (email, client_id))
        seeded.append((client_id, name, email))
    db.commit()
    db.close()

    print("Admin account:")
    ensure_user(ADMIN_EMAIL, {"role": "admin"})

    print("\nLogin credentials (password = email):")
    print(f"  {'id':>3}  {'company':<32} login")
    for client_id, name, email in seeded:
        print(f"  {client_id:>3}  {name:<32} {email}")
    print(f"  admin {'—':<30} {ADMIN_EMAIL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
