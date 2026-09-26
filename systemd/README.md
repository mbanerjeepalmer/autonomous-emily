# systemd units (Hetzner desktop)

Installed by `scripts/bootstrap.sh` onto the VPS.

| Unit / file | Role |
|-------------|------|
| `grok-vnc.service` | TigerVNC + XFCE via `/usr/local/bin/grok-vnc-run` (display `:1`, localhost only) |
| `grok-novnc.service` | noVNC/websockify on `127.0.0.1:6080` |
| `grok-desktop-auth.service` | JWT `forward_auth` validator for Caddy |
| `grok-caddy.service` | Public HTTPS → noVNC |
| `xstartup` | XFCE session + gnome-keyring |
| `grok-bot.desktop` | XFCE autostart for Grok Bot |
| `grok-bot-launch` | Electron launcher with `--user-data-dir` |

VNC (`5901`) and noVNC (`6080`) are **not** exposed publicly. Access is via Caddy `:443` with a JWT from the Next.js app (or Tailscale SSH for ops).
