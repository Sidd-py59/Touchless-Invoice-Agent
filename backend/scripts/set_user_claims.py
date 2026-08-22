"""Grant TIA roles to Firebase users via custom claims.

The backend trusts two custom claims on the Firebase ID token:
    role:      "admin" | "client"
    client_id: integer TIA client id (required for role=client)

Usage (from backend/, after the user has signed up in the app):
    python scripts/set_user_claims.py finance.ops@tasc.com --role admin
    python scripts/set_user_claims.py client@emiratessteel.ae --role client --client-id 1
    python scripts/set_user_claims.py someone@example.com --clear

The user must sign out and back in (or wait up to an hour for the token to
refresh) before new claims take effect.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from firebase_admin import auth as firebase_auth

from app.core.firebase import get_firebase_app


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email", help="Email of an existing Firebase user")
    parser.add_argument("--role", choices=["admin", "client"], help="Role to grant")
    parser.add_argument("--client-id", type=int, default=None, help="TIA client id (required with --role client)")
    parser.add_argument("--clear", action="store_true", help="Remove all custom claims from the user")
    args = parser.parse_args()

    if not args.clear and not args.role:
        parser.error("either --role or --clear is required")
    if args.role == "client" and args.client_id is None:
        parser.error("--client-id is required with --role client")

    get_firebase_app()

    try:
        user = firebase_auth.get_user_by_email(args.email)
    except firebase_auth.UserNotFoundError:
        print(f"No Firebase user found for {args.email}. They must sign up in the app first.")
        return 1

    if args.clear:
        claims: dict[str, object] | None = None
    else:
        claims = {"role": args.role}
        if args.client_id is not None:
            claims["client_id"] = args.client_id

    firebase_auth.set_custom_user_claims(user.uid, claims)
    print(f"Updated {args.email} (uid={user.uid}): claims={claims}")
    print("The user must sign out and back in for the new claims to take effect.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
