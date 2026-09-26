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
chmod +x infra/hetzner/scripts/*.sh infra/hetzner/systemd/grok-bot-launch infra/hetzner/systemd/grok-novnc-start infra/hetzner/systemd/grok-vnc-run infra/hetzner/systemd/xstartup infra/hetzner/gateway/auth_validate.py
./infra/hetzner/infra/hetzner/scripts/provision.sh
```

Default server type is **cx23** (Hetzner’s current 2 vCPU / 4 GB SKU; `cx22` was removed from the API). Use `server_type = "cx33"` in tfvars if RAM is tight.

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

1. Connect from `/desktop` (or open a JWT-minted `https://$DESKTOP_PUBLIC_HOST/vnc.html?…` URL).
2. In the remote XFCE session, Grok Bot should already be open (autostart). If not, run **Grok Bot** from the menu or `/usr/local/bin/grok-bot-launch`.
3. Complete **Cursor SSO** in the window that opens inside the remote desktop (one-time).
4. Unlock/persist the keyring if prompted so restarts keep the session.
5. Closing the browser tab does **not** stop cloud bots — only the view of the client. Killing Grok Bot on the VPS drops the client / local-exec side only.

## Tailscale (ops SSH)

Bootstrap installs Tailscale. With `TAILSCALE_AUTH_KEY` set it joins during bootstrap; otherwise on the server:

```bash
sudo tailscale up --ssh --hostname=grok-bot
```

Then prefer `ssh grok@grok-bot` (MagicDNS) and narrow `ssh_allow_cidrs` in Terraform.

## Hardening checklist

- TigerVNC / noVNC bound to localhost; only `:80`/`:443` (and SSH / Tailscale UDP) on the public firewall
- Key-only SSH (`ssh_pwauth: false` via cloud-init)
- `unattended-upgrades` enabled by bootstrap
- After Tailscale works, set `SSH_ALLOW_CIDR` to your IP and re-apply Terraform

## Reboot survival

```bash
sudo reboot
# after ~1–2 minutes
sudo systemctl is-active grok-vnc grok-novnc grok-desktop-auth grok-caddy
pgrep -af 'Grok Bot/grok-bot'
```

All four units are `enabled`. Grok Bot returns via XFCE autostart once VNC is up.

## Data survival (reboot vs destroy)

| Event | What happens |
|-------|----------------|
| **Reboot** (`sudo reboot` or Hetzner restart) | Disk persists. systemd brings VNC/Caddy/Grok Bot back. Chrome + Grok Bot login in `/home/grok` survive. |
| **Cursor cloud bots** | Not on this VPS — work continues in Cursor’s cloud computer even if Hetzner is down. |
| **Destroy / rebuild server** | Local login, Chrome profile, and files under `/home/grok` are gone unless restored from backup/snapshot. |

Persistent paths on the VPS:

- `~/.config/Grok Bot` — app session / userData  
- `~/.config/google-chrome` — OAuth cookies  
- `~/.grokbot` — local daemon state  
- `/etc/grok-desktop.env` — JWT secret (must stay in sync with Vercel)

### Protect against disk loss

1. **Hetzner automated backups** — enable on the server (`backups = true` in Terraform; ~20% surcharge). Daily backups, restore from console.
2. **Manual snapshot** after important milestones (e.g. post sign-in):

   ```bash
   # via Hetzner Console → Server → Snapshots → Create
   # or API create_image action
   ```

3. Never run `terraform destroy` unless you intend to wipe the box.
4. Keep `DESKTOP_JWT_SECRET` / `.env` backed up off-box (1Password, etc.) — not only on the VPS.

## Day-2

### Rotate desktop JWT secret

1. Generate a new secret.
2. Update Vercel env + `/etc/grok-desktop.env` on Hetzner.
3. `sudo systemctl restart grok-desktop-auth`.

### Upgrade Grok Bot

```bash
sudo bash ~/autonomous-emily/infra/hetzner/scripts/upgrade-grok-bot.sh
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
