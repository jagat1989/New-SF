#!/usr/bin/env bash
# ============================================================================
#  Special Fare — FIX LOGIN / DATABASE CONNECTION
#  Run this on your server as root to fix "Environment variable not found: DATABASE_URL"
#
#  Usage:  sudo bash fix-login.sh
# ============================================================================
set -e

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${YELLOW}ℹ${NC} $1"; }

APP_DIR="${APP_DIR:-/var/www/special-fare}"

echo -e "${BOLD}═══ Special Fare — Login Fix ═══${NC}\n"

# Check we're in the right place
if [ ! -d "$APP_DIR" ]; then
  err "App directory $APP_DIR not found."
  err "If your app is elsewhere, run:  APP_DIR=/your/path sudo bash fix-login.sh"
  exit 1
fi
cd "$APP_DIR"
ok "App directory: $APP_DIR"

# 1. Pull latest code
info "Pulling latest code (with .env auto-loader fix)..."
git pull origin main || { err "git pull failed"; exit 1; }
ok "Code updated"

# 2. Ask for Supabase password
echo ""
echo -e "${BOLD}Enter your Supabase database password${NC}"
echo "  (from Supabase → Project Settings → Database → Reset password if forgotten)"
read -rs -p "  Password: " SB_PASS
echo

if [ -z "$SB_PASS" ]; then
  err "Password cannot be empty"
  exit 1
fi

# 3. Percent-encode special characters in the password
ENCODED_PASS=$(printf '%s' "$SB_PASS" | sed -e 's/%/%25/g' -e 's/@/%40/g' -e 's/#/%23/g' -e 's/\//%2F/g' -e 's/:/%3A/g' -e 's/\?/%3F/g' -e 's/&/%26/g' -e 's/=/%3D/g' -e 's/+/%2B/g' -e 's/ /%20/g' -e 's/\$/%24/g' -e 's/!/%21/g' -e "s/'/%27/g" -e 's/(/%28/g' -e 's/)/%29/g')
info "Password encoded: ${ENCODED_PASS:0:4}****"

# 4. Generate session secret
SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 64)

# 5. Write .env to EVERY possible location
CONN="postgresql://postgres:${ENCODED_PASS}@db.iqqaafsyhpwfuucueftz.supabase.co:5432/postgres"

ENV_CONTENT="DATABASE_URL=${CONN}
DATABASE_URL_NON_POOLING=${CONN}
SESSION_SECRET=${SECRET}
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
ADMIN_EMAIL=specialfare21@gmail.com
ADMIN_PASSWORD=Kairavi@123
ADMIN_NAME=Special Fare Admin"

# Write to app root
echo "$ENV_CONTENT" > "$APP_DIR/.env"
ok ".env written to $APP_DIR/.env"

# Write to standalone dir (where server.js runs)
mkdir -p "$APP_DIR/.next/standalone"
echo "$ENV_CONTENT" > "$APP_DIR/.next/standalone/.env"
ok ".env written to $APP_DIR/.next/standalone/.env"

# 6. Install deps + generate Prisma
info "Installing dependencies..."
npm install --omit=dev=false 2>&1 | tail -1
ok "Dependencies installed"

info "Generating Prisma client..."
npx prisma generate 2>&1 | tail -1
ok "Prisma client generated"

# 7. Build
info "Building (1-2 min)..."
npm run build 2>&1 | tail -3
ok "Build complete"

# 8. Copy .env into standalone again (build may wipe it)
cp "$APP_DIR/.env" "$APP_DIR/.next/standalone/.env"
ok ".env re-copied to standalone dir"

# 9. Restart PM2
info "Restarting app..."
pm2 restart special-fare 2>/dev/null || pm2 start "$APP_DIR/.next/standalone/server.js" --name special-fare --cwd "$APP_DIR/.next/standalone"
pm2 save 2>/dev/null
ok "App restarted"

sleep 3

# 10. Test
echo ""
echo -e "${BOLD}Testing database connection...${NC}"
RESULT=$(curl -s --max-time 10 http://localhost:3000/api/db-check 2>&1)

if echo "$RESULT" | grep -q '"db_connected":true'; then
  ok "✅ DATABASE CONNECTED!"
  echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'  Users: {d.get(\"user_count\",0)}')
print(f'  Admins: {d.get(\"admin_count\",0)}')
ta = d.get('target_admin')
if ta:
    print(f'  Admin email: {ta[\"email\"]}')
    print(f'  Admin role: {ta[\"role\"]}')
    print(f'  Hash length: {ta[\"passwordHash_length\"]}')
    print(f'  Hash empty: {ta[\"passwordHash_is_empty\"]}')
" 2>/dev/null
  echo ""
  ok "🎉 Login should now work!"
  ok "   Email: specialfare21@gmail.com"
  ok "   Password: Kairavi@123"
else
  err "Database connection still failing. Diagnostic output:"
  echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
  echo ""
  info "Paste this output to your assistant for the next fix."
fi
