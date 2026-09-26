# Spec: Next.js → Grok Bot invoke (webhook)

For **you** (operator) and later agent sessions. Do not reinvent Hetzner/VNC; that stack is live.

---

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Next.js app (Vercel) — product + `/invoke` + `/desktop` |
| `infra/hetzner` | Grok Bot always-on client |

## Goal

```text
User/UI → Next.js POST /api/emily/invoke
       → Grok Bot routine webhook (Cursor cloud)
       → Bot works on Cursor cloud computer
```

Hetzner (`desktop.autonoemily.world`) = always-on signed-in **client**, not the invoke transport.

## Implemented

- `POST /api/emily/invoke` — session or `EMILY_INVOKE_SECRET` Bearer
- `/invoke` UI
- `/desktop` noVNC via `/enter` cookie JWT
- Auth: `APP_GATE_PASSWORD` / `SESSION_SECRET`

## Operator

1. Webhook routine Active in Grok Bot; `GROK_BOT_WEBHOOK_URL` + `KEY` in `.env` / Vercel.
2. Vercel **Root Directory** = `apps/web` (single project).
3. Env on Vercel: webhook + desktop JWT secrets + gate secrets + `NEXT_PUBLIC_APP_URL`.

## Payload

```json
{
  "task": "…",
  "context": {},
  "requestId": "…",
  "source": "autonoemily.world"
}
```
