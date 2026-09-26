#!/usr/bin/env python3
"""Caddy forward_auth validator for desktop JWT tokens issued by the Next.js app."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

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


def extract_token(handler: BaseHTTPRequestHandler) -> str | None:
    auth = handler.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None

    cookie = handler.headers.get("Cookie", "")
    for part in cookie.split(";"):
        name, _, value = part.strip().partition("=")
        if name == COOKIE and value:
            return value

    # Original request URI from Caddy forward_auth
    original = handler.headers.get("X-Forwarded-Uri") or handler.path
    query = parse_qs(urlparse(original).query)
    if "token" in query and query["token"]:
        return query["token"][0]
    return None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        return

    def do_GET(self) -> None:
        if urlparse(self.path).path not in ("/validate", "/healthz"):
            self.send_response(404)
            self.end_headers()
            return

        if urlparse(self.path).path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"ok")
            return

        if not SECRET:
            self.send_response(500)
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
        # Persist token for websocket upgrades that may omit the query string
        if token:
            self.send_header(
                "Set-Cookie",
                f"{COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600",
            )
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
