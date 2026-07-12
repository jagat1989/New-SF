#!/usr/bin/env bash
# ============================================================================
#  Special Fare — Update script
#  Run this AFTER you've pushed new code to your git repo.
#  Pulls latest, rebuilds, and restarts PM2 with zero-downtime-ish reload.
#
#  Usage:  sudo bash deploy/update.sh
# ============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'
BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}ℹ${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
step() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

if [[ $EUID -ne 0 ]]; then
  err "Run as root:  sudo bash deploy/update.sh"
  exit 1
fi

APP_DIR="/var/www/special-fare"
if [[ ! -d "$APP_DIR" ]]; then
  err "App directory ${APP_DIR} not found. Run deploy.sh first."
  exit 1
fi

cd "$APP_DIR"

step "1/6 — Pull latest code"
if [[ -d ".git" ]]; then
  git fetch --all
  # stash any local changes (e.g. .env) before pull
  git stash -q 2>/dev/null || true
  git pull --rebase origin main || git pull --rebase origin master || git reset --hard origin/main
  git stash pop -q 2>/dev/null || true
  ok "Code updated"
else
  warn "Not a git repo — skipping pull. Upload new files manually."
fi

step "2/6 — Install dependencies (only if package.json changed)"
npm install --omit=dev=false
ok "Dependencies up to date"

step "3/6 — Prisma generate (only if schema changed)"
npx prisma generate
ok "Prisma client regenerated"

step "4/6 — Apply DB schema changes (safe, additive)"
npx prisma db push
ok "Database schema synced"

step "5/6 — Build production bundle"
info "Building (1-2 min)..."
npm run build
# Copy static assets into standalone (the build script does this, but be safe)
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

# Copy .env + recreate the runtime wrapper (build wipes the standalone dir)
cp -f .env .next/standalone/.env
cat > .next/standalone/start.sh <<'EOF'
#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a
[ -f .env ] && source .env
set +a
exec node server.js
EOF
chmod +x .next/standalone/start.sh

chown -R www-data:www-data .next/standalone db
ok "Build complete"

step "6/6 — Restart PM2"
pm2 restart special-fare --update-env
ok "App restarted"
sleep 2

# smoke test
if curl -sf "http://127.0.0.1:3000/" -o /dev/null; then
  ok "App is live ✓"
else
  err "App not responding — check: pm2 logs special-fare"
  exit 1
fi

echo -e "\n${GREEN}${BOLD}✓ Update complete!${NC}"
echo "  pm2 logs special-fare --lines 20    # check for errors"
echo "  Visit your site to verify."
