#!/usr/bin/env bash
# Provision the Hetzner server with Terraform, then print bootstrap instructions.
# Usage (from repo root):
#   set -a && source .env && set +a
#   ./scripts/provision.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="${ROOT}/terraform"

if [[ -z "${HCLOUD_TOKEN:-}" ]]; then
  echo "Set HCLOUD_TOKEN (see .env.example)." >&2
  exit 1
fi

if [[ -z "${DESKTOP_PUBLIC_HOST:-}" || -z "${DESKTOP_JWT_SECRET:-}" ]]; then
  echo "Set DESKTOP_PUBLIC_HOST and DESKTOP_JWT_SECRET (shared with Vercel)." >&2
  exit 1
fi

SSH_PUBLIC_KEY_PATH="${SSH_PUBLIC_KEY_PATH:-$HOME/.ssh/id_ed25519.pub}"
SSH_PUBLIC_KEY_PATH="${SSH_PUBLIC_KEY_PATH/#\~/$HOME}"

if [[ ! -f "${SSH_PUBLIC_KEY_PATH}" ]]; then
  echo "SSH public key not found at ${SSH_PUBLIC_KEY_PATH}" >&2
  exit 1
fi

SSH_PUBLIC_KEY="$(cat "${SSH_PUBLIC_KEY_PATH}")"
DESKTOP_USER="${DESKTOP_USER:-grok}"
FRAME_ANCESTORS="${FRAME_ANCESTORS:-https://*.vercel.app http://localhost:3000}"
if [[ -n "${NEXT_PUBLIC_APP_URL:-}" ]]; then
  FRAME_ANCESTORS="${FRAME_ANCESTORS} ${NEXT_PUBLIC_APP_URL}"
fi

EXTRA_VARS=()
if [[ -n "${SSH_ALLOW_CIDR:-}" ]]; then
  EXTRA_VARS+=(-var="ssh_allow_cidrs=[\"${SSH_ALLOW_CIDR}\"]")
fi

cd "${TF_DIR}"
terraform init -upgrade
terraform apply -auto-approve \
  -var="hcloud_token=${HCLOUD_TOKEN}" \
  -var="ssh_public_key=${SSH_PUBLIC_KEY}" \
  -var="desktop_user=${DESKTOP_USER}" \
  "${EXTRA_VARS[@]}"

IPV4="$(terraform output -raw server_ipv4)"
USER_OUT="$(terraform output -raw desktop_user)"

cat <<EOF

Server ready: ${IPV4}

1) DNS: create A record  ${DESKTOP_PUBLIC_HOST}  →  ${IPV4}

2) Wait ~30s for cloud-init, then:

  cd ${ROOT}
  rsync -av scripts systemd gateway ${USER_OUT}@${IPV4}:~/autonomous-emily/
  ssh ${USER_OUT}@${IPV4} 'sudo \\
    DESKTOP_USER=${USER_OUT} \\
    DESKTOP_PUBLIC_HOST=${DESKTOP_PUBLIC_HOST} \\
    DESKTOP_JWT_SECRET='\''${DESKTOP_JWT_SECRET}'\'' \\
    FRAME_ANCESTORS='\''${FRAME_ANCESTORS}'\'' \\
    TAILSCALE_AUTH_KEY='\''${TAILSCALE_AUTH_KEY:-}'\'' \\
    bash ~/autonomous-emily/scripts/bootstrap.sh'

3) Vercel: set APP_GATE_PASSWORD, SESSION_SECRET, DESKTOP_JWT_SECRET,
   DESKTOP_PUBLIC_HOST, NEXT_PUBLIC_APP_URL — then deploy and open /desktop.

EOF
