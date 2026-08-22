"""
One-shot Gmail OAuth setup for TIA's payroll inbox integration.

Mints a refresh token for the mailbox that TIA monitors (GMAIL_SYNC_TO_EMAIL)
and writes it into backend/.env. Reuses GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET
already present in .env — the OAuth client must be of type "Desktop app", and
the mailbox owner must be listed as a test user on the OAuth consent screen
while the app is in Testing mode.

Usage:
    cd backend
    uv run python scripts/gmail_oauth_setup.py

A browser window opens; sign in as the mailbox you want TIA to monitor
(e.g. siddharth.dev404@gmail.com) and grant read access. The script verifies
which account authorized and updates GMAIL_REFRESH_TOKEN in .env.

Stdlib only — no extra dependencies.
"""
from __future__ import annotations

import json
import re
import socket
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


def write_env_value(path: Path, key: str, value: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    pattern = re.compile(rf"^{re.escape(key)}=")
    replaced = False
    for i, line in enumerate(lines):
        if pattern.match(line.strip()):
            lines[i] = f"{key}={value}"
            replaced = True
            break
    if not replaced:
        lines.append(f"{key}={value}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


class _CallbackHandler(BaseHTTPRequestHandler):
    code: str | None = None
    error: str | None = None

    def do_GET(self) -> None:  # noqa: N802 (stdlib naming)
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        _CallbackHandler.code = (params.get("code") or [None])[0]
        _CallbackHandler.error = (params.get("error") or [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        body = (
            "<h2>TIA Gmail authorization complete.</h2>"
            "<p>You can close this tab and return to the terminal.</p>"
            if _CallbackHandler.code
            else f"<h2>Authorization failed.</h2><p>{_CallbackHandler.error}</p>"
        )
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, *args) -> None:  # silence request logging
        pass


def post_form(url: str, fields: dict[str, str]) -> dict:
    data = urllib.parse.urlencode(fields).encode("utf-8")
    request = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url: str, token: str) -> dict:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    env = read_env(ENV_PATH)
    client_id = env.get("GMAIL_CLIENT_ID", "")
    client_secret = env.get("GMAIL_CLIENT_SECRET", "")
    expected_mailbox = env.get("GMAIL_SYNC_TO_EMAIL", "")

    if not client_id or not client_secret:
        print("GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET missing in backend/.env.")
        print("Create a 'Desktop app' OAuth client in Google Cloud Console first.")
        return 1

    # Use a fixed port (8080) so it can be whitelisted in GCP if using a Web App client
    port = 8080
    redirect_uri = f"http://127.0.0.1:{port}/"

    auth_params = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    auth_url = f"{AUTH_URL}?{auth_params}"

    server = HTTPServer(("127.0.0.1", port), _CallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    print(f"Opening browser for Google sign-in (mailbox to authorize: {expected_mailbox or 'any'})")
    print("If the browser does not open, visit this URL manually:\n")
    print(auth_url + "\n")
    webbrowser.open(auth_url)

    thread.join(timeout=600)
    server.server_close()

    if _CallbackHandler.error:
        print(f"Authorization failed: {_CallbackHandler.error}")
        return 1
    if not _CallbackHandler.code:
        print("Timed out waiting for the OAuth redirect (10 minutes). Try again.")
        return 1

    tokens = post_form(
        TOKEN_URL,
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": _CallbackHandler.code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
    )
    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token", "")
    if not refresh_token:
        print(f"Google did not return a refresh_token: {tokens}")
        return 1

    # Confirm which mailbox actually granted access
    authorized_mailbox = ""
    try:
        authorized_mailbox = get_json(PROFILE_URL, access_token).get("emailAddress", "")
    except Exception as exc:  # profile check is best-effort
        print(f"Warning: could not verify the authorized mailbox: {exc}")

    if authorized_mailbox:
        print(f"Authorized mailbox: {authorized_mailbox}")
        if expected_mailbox and authorized_mailbox.lower() != expected_mailbox.lower():
            print(
                f"WARNING: you signed in as {authorized_mailbox}, but GMAIL_SYNC_TO_EMAIL "
                f"is {expected_mailbox}. TIA reads the signed-in mailbox — re-run and "
                "sign in with the correct account, or update GMAIL_SYNC_TO_EMAIL."
            )

    write_env_value(ENV_PATH, "GMAIL_REFRESH_TOKEN", refresh_token)
    print(f"GMAIL_REFRESH_TOKEN updated in {ENV_PATH}")
    print("Restart the backend to activate the new mailbox integration.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
