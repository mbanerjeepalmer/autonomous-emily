# Runbook: Vercel Next.js + Hetzner Grok Bot

## Architecture

1. **Vercel** hosts this Next.js app (`/`, `/desktop`, `/api/*`).
2. After operator login (`APP_GATE_PASSWORD`), `POST /api/desktop/session` mints a 1-hour HS256 JWT with `aud=desktop`.
3. The `/desktop` page iframes `https://$DESKTOP_PUBLIC_HOST/vnc.html?token=…&path=websockify?token=…`.
4. **Caddy** on Hetzner terminates TLS, runs `forward_auth` against `auth_validate.py`, then proxies to local noVNC.
5. **Grok Bot** runs in XFCE; bots still execute on Cursor’s cloud computer.

## Prerequisites

- Hetzner Cloud API token
- Domain name you control (for `DESKTOP_PUBLIC_HOST`)
- Tailscale auth key (ops SSH)
- Vercel project linked to this repo
- Terraform `>= 1.5`, Node 20+, `rsync`

## Configure

```bash
cp .env.example .env
```

Generate secrets:

```bash
openssl rand -hex 32   # DESKTOP_JWT_SECRET
openssl rand -hex 32   # SESSION_SECRET
```

Use the **same** `DESKTOP_JWT_SECRET` in `.env` (bootstrap) and in the Vercel project env.

## Provision Hetzner

```bash
set -a && source .env && set +a
chmod +x scripts/*.sh systemd/grok-bot-launch systemd/grok-novnc-start systemd/xstartup gateway/auth_validate.py
./scripts/provision.sh
```

Create DNS **A** record: `DESKTOP_PUBLIC_HOST` → server IPv4.

Then run the printed `rsync` + `bootstrap.sh` (requires `DESKTOP_PUBLIC_HOST` + `DESKTOP_JWT_SECRET`).

Confirm:

```bash
ssh grok@<tailscale-or-public-ip>
sudo systemctl status grok-vnc grok-novnc grok-desktop-auth grok-caddy
curl -sS http://127.0.0.1:8091/healthz
```

Caddy should obtain a Let’s Encrypt cert once DNS propagates.

## Deploy Next.js to Vercel

1. Import the Git repo in Vercel (framework: Next.js).
2. Set environment variables:

   | Name | Notes |
   |------|--------|
   | `APP_GATE_PASSWORD` | Operator gate |
   | `SESSION_SECRET` | Cookie signing |
   | `DESKTOP_JWT_SECRET` | Must match Hetzner `/etc/grok-desktop.env` |
   | `DESKTOP_PUBLIC_HOST` | Hostname only, e.g. `desktop.example.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (and custom domain if any) |

3. Deploy. Open `https://your-app.vercel.app/desktop`.

4. If the iframe is blank, ensure Hetzner `FRAME_ANCESTORS` includes your Vercel URL (bootstrap uses `https://*.vercel.app` by default). Re-run bootstrap or edit `/etc/caddy/Caddyfile` and `sudo systemctl reload grok-caddy`.

## First Grok Bot login

1. Connect from `/desktop`.
2. In the remote XFCE session, complete Cursor SSO for Grok Bot once.
3. Subsequent visits only need the Vercel gate + desktop JWT; Grok Bot should stay signed in via the keyring/session on the VPS.

## Day-2

### Rotate desktop JWT secret

1. Generate a new secret.
2. Update Vercel env + `/etc/grok-desktop.env` on Hetzner.
3. `sudo systemctl restart grok-desktop-auth`.

### Upgrade Grok Bot

```bash
sudo bash ~/autonomous-emily/scripts/upgrade-grok-bot.sh
```

### Status

```bash
sudo journalctl -u grok-caddy -u grok-desktop-auth -u grok-novnc -f
```

## Troubleshooting

| Symptom | Check |
|---------|--------|
| iframe 401 | JWT secret mismatch; token expired (>1h) — click Refresh session |
| iframe refused / blank | `frame-ancestors` / CSP on Caddy; custom domain not listed |
| TLS errors | DNS A record; `sudo journalctl -u grok-caddy` |
| Black VNC | `systemctl restart grok-vnc grok-novnc` |
| Vercel 500 on session | Missing `DESKTOP_JWT_SECRET` / `DESKTOP_PUBLIC_HOST` |

## Out of scope

- Self-hosting Cursor’s bot cloud computer
- Proxying noVNC WebSockets through Vercel serverless (unsupported) — tokens + direct desktop origin is intentional
