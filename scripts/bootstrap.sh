#!/usr/bin/env bash
# Bootstrap a Hetzner Ubuntu 24.04 box for always-on Grok Bot.
# Public access: Caddy HTTPS + JWT (issued by the Vercel Next.js app).
# Tailscale remains for SSH / ops.
#
# Required env:
#   DESKTOP_PUBLIC_HOST   e.g. desktop.example.com (DNS A → this server)
#   DESKTOP_JWT_SECRET    shared with Vercel (HS256)
# Optional:
#   DESKTOP_USER, TAILSCALE_AUTH_KEY, FRAME_ANCESTORS
#
set -euo pipefail

DESKTOP_USER="${DESKTOP_USER:-grok}"
TAILSCALE_AUTH_KEY="${TAILSCALE_AUTH_KEY:-}"
DESKTOP_PUBLIC_HOST="${DESKTOP_PUBLIC_HOST:-}"
DESKTOP_JWT_SECRET="${DESKTOP_JWT_SECRET:-}"
FRAME_ANCESTORS="${FRAME_ANCESTORS:-https://*.vercel.app http://localhost:3000}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_SRC="${REPO_ROOT}/systemd"
GATEWAY_SRC="${REPO_ROOT}/gateway"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

if [[ -z "${DESKTOP_PUBLIC_HOST}" || -z "${DESKTOP_JWT_SECRET}" ]]; then
  echo "Set DESKTOP_PUBLIC_HOST and DESKTOP_JWT_SECRET." >&2
  exit 1
fi

if ! id "${DESKTOP_USER}" >/dev/null 2>&1; then
  echo "User ${DESKTOP_USER} does not exist. Create it first (cloud-init should have)." >&2
  exit 1
fi

HOME_DIR="$(getent passwd "${DESKTOP_USER}" | cut -d: -f6)"

log() { printf '==> %s\n' "$*"; }

export DEBIAN_FRONTEND=noninteractive

log "Updating apt and installing desktop / VNC stack"
apt-get update -y
apt-get install -y \
  xfce4 xfce4-terminal dbus-x11 \
  tigervnc-standalone-server tigervnc-common \
  novnc websockify \
  gnome-keyring libsecret-1-0 libsecret-tools \
  curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https \
  fonts-dejavu-core fonts-liberation \
  xdg-utils \
  python3 \
  unattended-upgrades \
  ufw

log "Installing Caddy"
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

log "Installing Tailscale"
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

if [[ -n "${TAILSCALE_AUTH_KEY}" ]]; then
  log "Joining Tailscale tailnet"
  tailscale up --auth-key="${TAILSCALE_AUTH_KEY}" --ssh --hostname="grok-bot" --accept-dns=true
else
  log "TAILSCALE_AUTH_KEY not set — run: sudo tailscale up --ssh --hostname=grok-bot"
fi

log "Installing Grok Bot from Cursor apt repo"
install -d -m 0755 /usr/share/keyrings
curl -fsSL https://downloads.cursor.com/keys/anysphere.asc \
  | gpg --dearmor -o /usr/share/keyrings/grok-bot.gpg
chmod 0644 /usr/share/keyrings/grok-bot.gpg

cat >/etc/apt/sources.list.d/grok-bot.sources <<'EOF'
Types: deb
URIs: https://downloads.cursor.com/aptrepo
Suites: grok-bot
Components: main
Signed-By: /usr/share/keyrings/grok-bot.gpg
EOF

apt-get update -y
if ! apt-get install -y grok-bot; then
  log "apt package grok-bot failed — trying alternate name"
  apt-get install -y grokbot || {
    echo "Could not install Grok Bot via apt. Download a .deb from https://cursor.com/download/bot" >&2
  }
fi

log "Installing helper scripts and gateway"
install -m 0755 "${SYSTEMD_SRC}/grok-bot-launch" /usr/local/bin/grok-bot-launch
install -m 0755 "${SYSTEMD_SRC}/grok-novnc-start" /usr/local/bin/grok-novnc-start
install -m 0755 "${SYSTEMD_SRC}/grok-vnc-run" /usr/local/bin/grok-vnc-run
install -d /usr/local/lib/grok-desktop
install -m 0755 "${GATEWAY_SRC}/auth_validate.py" /usr/local/lib/grok-desktop/auth_validate.py

# Ensure launcher symlink
if [[ ! -x /usr/bin/grok-bot ]]; then
  for candidate in "/opt/Grok Bot/grok-bot" "/opt/Grok Bot/grokbot" /opt/grok-bot/grok-bot; do
    if [[ -x "$candidate" ]]; then
      ln -sfn "$candidate" /usr/local/bin/grok-bot
      break
    fi
  done
fi

# Desktop dirs must be owned by the session user (not root)
install -d -o "${DESKTOP_USER}" -g "${DESKTOP_USER}" \
  "${HOME_DIR}/.config" "${HOME_DIR}/.cache" "${HOME_DIR}/.local/share" \
  "${HOME_DIR}/.config/Grok Bot" "${HOME_DIR}/.grokbot"
chown -R "${DESKTOP_USER}:${DESKTOP_USER}" "${HOME_DIR}/.config" "${HOME_DIR}/.cache" "${HOME_DIR}/.local" || true

log "Writing /etc/grok-desktop.env"
cat >/etc/grok-desktop.env <<EOF
DESKTOP_JWT_SECRET=${DESKTOP_JWT_SECRET}
DESKTOP_PUBLIC_HOST=${DESKTOP_PUBLIC_HOST}
DESKTOP_AUTH_LISTEN=127.0.0.1:8091
EOF
chmod 0600 /etc/grok-desktop.env

log "Writing Caddyfile"
FRAME_CSP="$(echo "${FRAME_ANCESTORS}" | xargs)"
sed \
  -e "s/__DESKTOP_PUBLIC_HOST__/${DESKTOP_PUBLIC_HOST}/g" \
  -e "s|__FRAME_ANCESTORS__|${FRAME_CSP}|g" \
  "${GATEWAY_SRC}/Caddyfile" >/etc/caddy/Caddyfile

log "Configuring VNC for ${DESKTOP_USER} (localhost, no VNC password — JWT is the gate)"
install -d -o "${DESKTOP_USER}" -g "${DESKTOP_USER}" -m 0700 "${HOME_DIR}/.vnc"
install -m 0755 "${SYSTEMD_SRC}/xstartup" "${HOME_DIR}/.vnc/xstartup"
chown "${DESKTOP_USER}:${DESKTOP_USER}" "${HOME_DIR}/.vnc/xstartup"

cat >"${HOME_DIR}/.vnc/config" <<'EOF'
session=xfce
geometry=1920x1080
depth=24
localhost
alwaysshared
SecurityTypes=None
EOF
chown "${DESKTOP_USER}:${DESKTOP_USER}" "${HOME_DIR}/.vnc/config"
chmod 0644 "${HOME_DIR}/.vnc/config"

# Dummy passwd file some TigerVNC builds still expect
su -s /bin/bash -c "printf 'unused\n' | vncpasswd -f > '${HOME_DIR}/.vnc/passwd' || true" "${DESKTOP_USER}"
chmod 0600 "${HOME_DIR}/.vnc/passwd" 2>/dev/null || true
chown "${DESKTOP_USER}:${DESKTOP_USER}" "${HOME_DIR}/.vnc/passwd" 2>/dev/null || true

log "XFCE autostart for Grok Bot"
install -d -o "${DESKTOP_USER}" -g "${DESKTOP_USER}" -m 0755 \
  "${HOME_DIR}/.config/autostart"
install -m 0644 "${SYSTEMD_SRC}/grok-bot.desktop" \
  "${HOME_DIR}/.config/autostart/grok-bot.desktop"
chown "${DESKTOP_USER}:${DESKTOP_USER}" \
  "${HOME_DIR}/.config/autostart/grok-bot.desktop"

install -d -o "${DESKTOP_USER}" -g "${DESKTOP_USER}" "${HOME_DIR}/.config/xfce4"
su -s /bin/bash -c "touch '${HOME_DIR}/.config/xfce4/xfconf-setup-complete'" "${DESKTOP_USER}" || true

log "Installing systemd units"
sed "s/__DESKTOP_USER__/${DESKTOP_USER}/g" \
  "${SYSTEMD_SRC}/grok-vnc.service" >/etc/systemd/system/grok-vnc.service
sed "s/__DESKTOP_USER__/${DESKTOP_USER}/g" \
  "${SYSTEMD_SRC}/grok-novnc.service" >/etc/systemd/system/grok-novnc.service
cp "${SYSTEMD_SRC}/grok-desktop-auth.service" /etc/systemd/system/grok-desktop-auth.service
cp "${SYSTEMD_SRC}/grok-caddy.service" /etc/systemd/system/grok-caddy.service

# Prefer distro caddy unit if present; otherwise use ours
systemctl daemon-reload
systemctl disable --now caddy 2>/dev/null || true

systemctl enable --now grok-vnc.service
systemctl enable --now grok-novnc.service
systemctl enable --now grok-desktop-auth.service
systemctl enable --now grok-caddy.service

log "Host firewall: SSH, HTTP/HTTPS, Tailscale"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp comment 'ACME'
ufw allow 443/tcp comment 'Desktop HTTPS'
ufw allow 41641/udp comment 'Tailscale'
ufw --force enable

log "Unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades || true

TS_IP="$(tailscale ip -4 2>/dev/null || echo '(tailscale not connected)')"

cat <<EOF

Bootstrap complete.

  Desktop user     : ${DESKTOP_USER}
  Public desktop   : https://${DESKTOP_PUBLIC_HOST}/vnc.html?autoconnect=1&resize=remote&token=<jwt>
  Tailscale IP     : ${TS_IP}
  Frame ancestors  : ${FRAME_CSP}

DNS: point ${DESKTOP_PUBLIC_HOST} A → this server's public IPv4, then wait for Caddy certificates.

Next:
  1. Deploy the Next.js app on Vercel with the same DESKTOP_JWT_SECRET and DESKTOP_PUBLIC_HOST.
  2. Open the Vercel /desktop page, sign in with APP_GATE_PASSWORD, and use Open desktop.
  3. Inside noVNC, sign in to Grok Bot with Cursor SSO (one-time).

Useful:
  sudo systemctl status grok-vnc grok-novnc grok-desktop-auth grok-caddy
  sudo journalctl -u grok-caddy -u grok-desktop-auth -f

EOF
