# Autonomous Emily (monorepo)

| Path | Role |
|------|------|
| [`apps/web`](apps/web) | Next.js product app (Vercel) — sourcing / opportunities prototype |
| [`apps/control`](apps/control) | Next.js ops surface — Grok Bot desktop viewer + webhook invoke |
| [`infra/hetzner`](infra/hetzner) | Always-on Grok Bot client (Terraform, bootstrap, Caddy/noVNC) |
| [`docs/`](docs) | Runbook + invoke spec |

## Quick start

```bash
npm install
npm run dev            # web → http://localhost:3000
npm run dev:control    # control (use another port if both run)
```

Grok Bot desktop: [`docs/runbook.md`](docs/runbook.md)  
Invoke Bot from the app: [`docs/SPEC-nextjs-invoke-grok-bot.md`](docs/SPEC-nextjs-invoke-grok-bot.md)

Hetzner provision:

```bash
set -a && source .env && set +a
./infra/hetzner/scripts/provision.sh
```
