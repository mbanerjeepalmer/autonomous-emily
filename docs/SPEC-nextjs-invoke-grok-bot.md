# Spec: Next.js → Grok Bot invoke (webhook)

For **you** (operator) and the **next agent session**. Do not reinvent Hetzner/VNC; that stack is live.

---

## Monorepo layout

| Path | Role |
|------|------|
| `apps/grail-finder` | Product Next.js app (Vercel) |
| `apps/control` | Ops Next.js — `/desktop` + invoke API |
| `infra/hetzner` | Grok Bot always-on client |

Invoke route lands in **`apps/control`**. Product UI that calls it may live in `grail-finder` or `control` — prefer implementing the API in `control` first.

## Goal

Let the Next.js app on Vercel **wake a Grok Bot** by HTTP POST.  
Results flow back via chat / optional MCP later. Full desktop (`/desktop`) stays for SSO and ops only.

```text
User/UI → Next.js POST /api/emily/invoke
       → Grok Bot routine webhook (Cursor cloud)
       → Bot works on Cursor cloud computer
```

Hetzner (`desktop.autonoemily.world`) = always-on signed-in **client**, not the invoke transport.

---

## Current state (already done)

| Piece | Detail |
|-------|--------|
| VPS | Hetzner `grok-bot`, IP `167.233.134.31`, backups on |
| Desktop HTTPS | `https://desktop.autonoemily.world` (Caddy + JWT) |
| Entry URL | `/enter?token=…` sets cookie → noVNC (not bare `/vnc.html?token=`) |
| Next.js (repo) | `/desktop`, `/api/auth/login`, `/api/desktop/session` |
| Grok Bot | Signed in on the VPS; Chrome installed for OAuth |
| Secrets | In local `.env` (gitignored); operator should have a vault copy |

**Do not:** `terraform destroy`, rotate `DESKTOP_JWT_SECRET` without updating Vercel + `/etc/grok-desktop.env`, expose VNC ports publicly.

---

## Operator steps (you)

1. On the remote desktop, open Grok Bot.
2. Create or pick a Bot that should own Emily tasks.
3. Add a **routine**:
   - **When to run:** Webhook  
   - **Instruction (example):**  
     `When triggered, read the JSON body. Use fields task (required), context (optional), requestId (optional). Do the task. Report completion in this chat. If blocked, say what you need.`  
   - Save, set **Active**.
4. Re-open the routine → copy **POST URL** and **key**.
5. Store in your vault and later in Vercel env:
   - `GROK_BOT_WEBHOOK_URL`
   - `GROK_BOT_WEBHOOK_KEY`
6. Optional test from your laptop:

```bash
curl -sS -X POST "$GROK_BOT_WEBHOOK_URL" \
  -H "Authorization: Bearer $GROK_BOT_WEBHOOK_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task":"Reply in chat with: webhook ok","requestId":"manual-1"}'
```

Expect **200** = run *started*. Check the Bot conversation / run history for the reply.

---

## Agent session instructions (implement next)

### Scope

1. Add Vercel env docs for `GROK_BOT_WEBHOOK_URL`, `GROK_BOT_WEBHOOK_KEY` (and existing desktop secrets).
2. Implement `POST /api/emily/invoke`:
   - Require app session (`APP_GATE_PASSWORD` / `ae_session`) **or** a separate `EMILY_INVOKE_SECRET` header for server-to-server.
   - Body: `{ task: string, context?: unknown, requestId?: string }`.
   - Forward to Grok webhook with `Authorization: Bearer $GROK_BOT_WEBHOOK_KEY`.
   - Return `{ ok: true, status: number, requestId }` on webhook 200; surface non-200 clearly.
3. Minimal UI: home or `/desktop` sibling page with a text field + “Run” that calls invoke (session-gated).
4. Do **not** scrape VNC, SSH into the box to click Grok Bot, or use undocumented `:1340` gateway APIs.
5. MCP (bot → app) is **out of scope** for this pass unless asked.

### Payload contract

```json
{
  "task": "Human-readable instruction for the Bot",
  "context": { "optional": "structured data" },
  "requestId": "idempotency / correlation id",
  "source": "autonoemily.world"
}
```

Routine prompt must tell the Bot to honor these fields.

### Env (Vercel)

| Name | Notes |
|------|--------|
| `GROK_BOT_WEBHOOK_URL` | From routine panel |
| `GROK_BOT_WEBHOOK_KEY` | Bearer key from routine panel |
| `DESKTOP_JWT_SECRET` | Same as Hetzner `/etc/grok-desktop.env` |
| `DESKTOP_PUBLIC_HOST` | `desktop.autonoemily.world` |
| `APP_GATE_PASSWORD` / `SESSION_SECRET` | Existing gate |
| `NEXT_PUBLIC_APP_URL` | Production site URL when known |

### Acceptance

- [ ] Curl/UI invoke → webhook 200 → Bot run visible in Grok Bot.
- [ ] Unauthenticated invoke rejected.
- [ ] `/desktop` still works via `/enter` cookie flow.
- [ ] No secrets committed; `.env.example` updated with empty placeholders.

### Repo pointers

- Auth/desktop JWT: [`apps/control/lib/auth.ts`](../apps/control/lib/auth.ts)
- Desktop UI: [`apps/control/components/DesktopClient.tsx`](../apps/control/components/DesktopClient.tsx)
- Ops runbook: [`docs/runbook.md`](./runbook.md)
- Hetzner gateway: [`infra/hetzner/gateway/`](../infra/hetzner/gateway/)

---

## Later (not this session)

- MCP server on Vercel for Bot → Emily product tools.
- `GET /api/desktop/health` status chip.
- Custom domain for the Next app on `autonoemily.world` (replace apex URL redirect with Vercel DNS).
