#!/usr/bin/env bash
# ============================================================
# deploy/setup.sh — Ubuntu Server deploy script
# ============================================================
# Usage: curl -fsSL https://raw.githubusercontent.com/.../deploy/setup.sh | bash
# Or:   bash deploy/setup.sh
#
# Prerequisites: git, sudo access
# Domain: set DOMAIN env before running, e.g.
#   DOMAIN=ball-stream.kana.my.id bash deploy/setup.sh
# ============================================================
set -euo pipefail

# ── Config ──────────────────────────────────────────────────
REPO_URL="https://github.com/kalam22/ballstream.git"
DEPLOY_DIR="/opt/ballstream"
DOMAIN="${DOMAIN:-ball-stream.kana.my.id}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo "============================================"
echo "  Ballstream — Ubuntu Deploy"
echo "============================================"

# ── 1. Check prerequisites ──────────────────────────────────
if [ "$EUID" -eq 0 ]; then
  echo "❌ Do NOT run as root. Run as a sudo-capable user."
  exit 1
fi

for cmd in git docker docker compose; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ $cmd not found. Installing..."
    case "$cmd" in
      docker)
        curl -fsSL https://get.docker.com | bash
        sudo usermod -aG docker "$USER"
        echo "⚠️  You'll need to log out and back in for docker group to take effect."
        ;;
      docker\ compose)
        echo "docker compose should be bundled with Docker Engine 25+"
        exit 1
        ;;
      git) sudo apt-get install -y git ;;
    esac
  fi
done

# ── 2. Clone / pull project ─────────────────────────────────
if [ -d "$DEPLOY_DIR" ]; then
  echo "📂 Project exists — pulling latest..."
  cd "$DEPLOY_DIR"
  git pull
else
  echo "📂 Cloning project..."
  sudo mkdir -p "$DEPLOY_DIR"
  sudo chown "$USER":"$USER" "$DEPLOY_DIR"
  git clone "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi

# ── 3. Setup .env ───────────────────────────────────────────
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    cp .env.production .env
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ⚠️  EDIT .env NOW with your secrets!"
    echo "  Required:"
    echo "    • POSTGRES_PASSWORD  (random, 32+ chars)"
    echo "    • JWT_SECRET        (openssl rand -hex 32)"
    echo "    • ADMIN_PASSWORD    (your login password)"
    echo "  Run: nano .env"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  else
    echo "❌ .env.production not found. Create from template first."
    exit 1
  fi
fi

# ── 4. Setup TLS with Let's Encrypt ─────────────────────────
if ! command -v certbot &>/dev/null; then
  echo "🔐 Installing certbot..."
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx
fi

if [ -n "$DOMAIN" ]; then
  echo "🔐 Obtaining SSL cert for $DOMAIN..."
  sudo certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || true
fi

# ── 5. Build & start ────────────────────────────────────────
echo "🚀 Building and starting services..."
docker compose $COMPOSE_FILES build --parallel
docker compose $COMPOSE_FILES up -d

# ── 6. Verify ───────────────────────────────────────────────
echo ""
echo "✅ Deployment complete!"
echo "   Site:  https://$DOMAIN"
echo ""
echo "   Commands:"
echo "     docker compose logs -f     # tail logs"
echo "     docker compose ps          # check status"
echo "     docker compose restart     # restart all"
echo ""
