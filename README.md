# Autonomous Emily (monorepo)

| Path | Role |
|------|------|
| [`apps/grail-finder`](apps/grail-finder) | Next.js product prototype (Vercel) — under-catalogued footwear finder |
| [`apps/control`](apps/control) | Next.js ops surface — Grok Bot desktop viewer + (soon) webhook invoke |
| [`infra/hetzner`](infra/hetzner) | Always-on Grok Bot client (Terraform, bootstrap, Caddy/noVNC) |
| [`docs/`](docs) | Runbook + invoke spec |

## Quick start

```bash
npm install
npm run dev            # grail-finder → http://localhost:3000
npm run dev:control    # control → http://localhost:3000 (run separately / different port)
```

Grok Bot desktop: see [`docs/runbook.md`](docs/runbook.md).  
Invoke Bot from the app: [`docs/SPEC-nextjs-invoke-grok-bot.md`](docs/SPEC-nextjs-invoke-grok-bot.md).

Hetzner provision (from repo root):

```bash
set -a && source .env && set +a
./infra/hetzner/scripts/provision.sh
```
