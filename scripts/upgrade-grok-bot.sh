#!/usr/bin/env bash
# Upgrade Grok Bot on the box (run on the server as root).
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --only-upgrade grok-bot || apt-get install -y --only-upgrade grokbot

# Restart desktop session so the new binary is picked up
systemctl restart grok-vnc.service
# novnc depends on vnc; restart after vnc is back
sleep 2
systemctl restart grok-novnc.service

systemctl --no-pager --full status grok-vnc grok-novnc || true
echo "Upgrade + desktop restart done."
