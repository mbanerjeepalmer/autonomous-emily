terraform {
  required_version = ">= 1.5.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "hcloud_token" {
  type        = string
  sensitive   = true
  description = "Hetzner Cloud API token"
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key contents for the grok user / root bootstrap"
}

variable "server_name" {
  type        = string
  default     = "grok-bot"
  description = "Hetzner server name"
}

variable "server_type" {
  type        = string
  default     = "cx23"
  description = "Hetzner server type (cx23 ~2 vCPU / 4 GB; use cx33 if RAM is tight)"
}

variable "location" {
  type        = string
  default     = "fsn1"
  description = "Hetzner location: fsn1, nbg1, or hel1"
}

variable "ssh_allow_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
  description = "CIDRs allowed to SSH on port 22. Narrow after Tailscale is up."
}

variable "desktop_user" {
  type        = string
  default     = "grok"
  description = "Non-root user for the VNC / Grok Bot session"
}

resource "hcloud_ssh_key" "deploy" {
  name       = "${var.server_name}-deploy"
  public_key = var.ssh_public_key
}

resource "hcloud_firewall" "grok_bot" {
  name = "${var.server_name}-fw"

  dynamic "rule" {
    for_each = var.ssh_allow_cidrs
    content {
      direction   = "in"
      protocol    = "tcp"
      port        = "22"
      source_ips  = [rule.value]
      description = "SSH"
    }
  }

  # HTTPS for Caddy → noVNC (consumed by the Vercel Next.js app)
  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTP ACME"
  }

  rule {
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "HTTPS desktop gateway"
  }

  rule {
    direction   = "in"
    protocol    = "udp"
    port        = "41641"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "Tailscale"
  }

  rule {
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
    description = "ICMP"
  }
}

locals {
  cloud_init = <<-EOT
    #cloud-config
    package_update: true
    packages:
      - curl
      - ca-certificates
      - gnupg
      - ufw
      - unattended-upgrades
    users:
      - name: ${var.desktop_user}
        groups: [sudo, video, audio]
        shell: /bin/bash
        sudo: ALL=(ALL) NOPASSWD:ALL
        ssh_authorized_keys:
          - ${trimspace(var.ssh_public_key)}
    ssh_pwauth: false
    runcmd:
      - timedatectl set-ntp true
  EOT
}

resource "hcloud_server" "grok_bot" {
  name         = var.server_name
  server_type  = var.server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.grok_bot.id]
  user_data    = local.cloud_init
  backups      = true

  labels = {
    role    = "grok-bot-client"
    project = "autonomous-emily"
  }

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}

output "server_ipv4" {
  value       = hcloud_server.grok_bot.ipv4_address
  description = "Public IPv4 — point DESKTOP_PUBLIC_HOST A record here; also used for SSH bootstrap"
}

output "server_ipv6" {
  value       = hcloud_server.grok_bot.ipv6_address
  description = "Public IPv6"
}

output "server_id" {
  value = hcloud_server.grok_bot.id
}

output "desktop_user" {
  value = var.desktop_user
}

output "ssh_bootstrap" {
  value = "ssh ${var.desktop_user}@${hcloud_server.grok_bot.ipv4_address}"
}

output "dns_hint" {
  value = "Create an A record for your DESKTOP_PUBLIC_HOST pointing to ${hcloud_server.grok_bot.ipv4_address}"
}
