#!/usr/bin/env python3
"""Caddy forward_auth validator + /enter cookie bootstrap for desktop JWTs."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

SECRET = os.environ.get("DESKTOP_JWT_SECRET", "").encode("utf-8")
LISTEN = os.environ.get("DESKTOP_AUTH_LISTEN", "127.0.0.1:8091")
COOKIE = "desktop_session"


def b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def verify_jwt(token: str) -> dict | None:
    if not SECRET or token.count(".") != 2:
        return None
    header_b64, payload_b64, sig_b64 = token.split(".")
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    try:
        expected = hmac.new(SECRET, signing_input, hashlib.sha256).digest()
        got = b64url_decode(sig_b64)
    except Exception:
        return None
    if not hmac.compare_digest(expected, got):
        return None
    try:
        header = json.loads(b64url_decode(header_b64))
        payload = json.loads(b64url_decode(payload_b64))
    except Exception:
        return None
    if header.get("alg") != "HS256":
        return None
    now = int(time.time())
    if int(payload.get("exp", 0)) < now:
        return None
    aud = payload.get("aud")
    if aud not in (None, "desktop") and aud != ["desktop"]:
        return None
    return payload


def session_cookie(token: str) -> str:
    # SameSite=None so the Vercel iframe can send the cookie on WS/asset requests
    return (
        f"{COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600"
    )


def extract_token(handler: BaseHTTPRequestHandler) -> str | None:
    auth = handler.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None

    cookie = handler.headers.get("Cookie", "")
    for part in cookie.split(";"):
        name, _, value = part.strip().partition("=")
        if name == COOKIE and value:
            return value

    original = handler.headers.get("X-Forwarded-Uri") or handler.path
    query = parse_qs(urlparse(original).query)
    if "token" in query and query["token"]:
        return query["token"][0]
    return None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ok")
            return

        if not SECRET:
            self.send_response(500)
            self.end_headers()
            return

        # /enter?token=… — set cookie then redirect so CSS/JS/WebSocket auth via cookie
        if path == "/enter":
            qs = parse_qs(parsed.query)
            token = (qs.get("token") or [None])[0]
            claims = verify_jwt(token) if token else None
            if not claims or not token:
                self.send_response(401)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(b"invalid or missing token")
                return

            dest_qs = {
                "autoconnect": (qs.get("autoconnect") or ["1"])[0],
                "resize": (qs.get("resize") or ["remote"])[0],
            }
            location = f"/vnc.html?{urlencode(dest_qs)}"
            self.send_response(302)
            self.send_header("Set-Cookie", session_cookie(token))
            self.send_header("Location", location)
            self.end_headers()
            return

        if path != "/validate":
            self.send_response(404)
            self.end_headers()
            return

        token = extract_token(self)
        claims = verify_jwt(token) if token else None
        if not claims:
            self.send_response(401)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Remote-User", str(claims.get("sub", "desktop")))
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()


def main() -> None:
    host, _, port_s = LISTEN.partition(":")
    server = ThreadingHTTPServer((host or "127.0.0.1", int(port_s or "8091")), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
