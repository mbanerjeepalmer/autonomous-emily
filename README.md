# Autonomous Emily (monorepo)

| Path | Role |
|------|------|
| [`apps/web`](apps/web) | Next.js app (Vercel) — product UI, `/invoke`, `/desktop` |
| [`infra/hetzner`](infra/hetzner) | Always-on Grok Bot client (Terraform, bootstrap, Caddy/noVNC) |
| [`docs/`](docs) | Runbook + invoke spec |

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

- Product: `/` → `/insider` → `/requirements` → `/results` (starts Grok Bot, or Pi if toggled)
- Operator invoke: `/invoke`
- Remote desktop: `/desktop`

Grok Bot ops: [`docs/runbook.md`](docs/runbook.md)  
Webhook invoke: [`docs/SPEC-nextjs-invoke-grok-bot.md`](docs/SPEC-nextjs-invoke-grok-bot.md)

```bash
set -a && source .env && set +a
./infra/hetzner/scripts/provision.sh
```
