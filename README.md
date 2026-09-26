# Autonomous Emily

Next.js control surface on **Vercel** + always-on **Grok Bot** desktop on **Hetzner**.

```text
Browser → Vercel (/desktop)
            │  POST /api/desktop/session → JWT
            ▼
         iframe → https://DESKTOP_PUBLIC_HOST/vnc.html?token=…
                    │  Caddy TLS + forward_auth
                    ▼
                 noVNC → TigerVNC → Grok Bot (Electron)
                                      │
                                      ▼
                               Cursor cloud computer
```

## Quick start

### 1. Shared secrets

```bash
cp .env.example .env
```

Set at least:

| Variable | Where |
|----------|--------|
| `DESKTOP_JWT_SECRET` | Vercel **and** Hetzner (same value) |
| `DESKTOP_PUBLIC_HOST` | DNS hostname for the Hetzner desktop gateway |
| `APP_GATE_PASSWORD` | Vercel only — gates the web UI |
| `SESSION_SECRET` | Vercel only — signs the operator cookie |
| `HCLOUD_TOKEN` / `TAILSCALE_AUTH_KEY` | Laptop → Terraform / bootstrap |

### 2. Hetzner

```bash
set -a && source .env && set +a
./scripts/provision.sh
# follow printed DNS + rsync/bootstrap steps
```

### 3. Vercel

```bash
npm install
npm run dev   # local
# or: vercel --prod
```

Env on Vercel: `APP_GATE_PASSWORD`, `SESSION_SECRET`, `DESKTOP_JWT_SECRET`, `DESKTOP_PUBLIC_HOST`, `NEXT_PUBLIC_APP_URL`.

Open `/desktop`, sign in, **Connect** — the iframe loads the authenticated noVNC session.

## Layout

| Path | Role |
|------|------|
| [app/](app/) | Next.js (Vercel) |
| [lib/auth.ts](lib/auth.ts) | Operator session + desktop JWT |
| [terraform/](terraform/) | Hetzner CX22 + firewall (22/80/443/Tailscale) |
| [gateway/](gateway/) | Caddyfile + JWT `forward_auth` validator |
| [scripts/bootstrap.sh](scripts/bootstrap.sh) | XFCE, VNC, noVNC, Caddy, Grok Bot |
| [docs/runbook.md](docs/runbook.md) | Full ops runbook |

## Security model

- TigerVNC and noVNC bind to **localhost** only (`SecurityTypes=None` on loopback).
- Public entry is **Caddy :443** with JWT validation (`DESKTOP_JWT_SECRET`).
- Vercel never proxies the WebSocket; it only mints tokens and embeds the desktop origin.
- Tailscale remains for SSH/ops.
