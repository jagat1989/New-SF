#!/usr/bin/env bash
# ============================================================================
#  Special Fare — live-portal login diagnostic
#  SSH into your server and run:
#    cd /var/www/special-fare && bash deploy/diagnose.sh
#
#  It checks: app running? .env present? DB exists? admin user exists?
#  cookie secret set? login API responds? — then prints a verdict.
# ============================================================================

set +e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'
BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
hr()   { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

APP_DIR="${APP_DIR:-/var/www/special-fare}"
cd "$APP_DIR" 2>/dev/null || { err "App dir $APP_DIR not found"; exit 1; }

hr "1. Is the Node app running (PM2)?"
PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); p=[x for x in d if x['name']=='special-fare']; print(p[0]['pm2_env']['status'] if p else 'NOT_FOUND')" 2>/dev/null)
if [[ "$PM2_STATUS" == "online" ]]; then
  ok "PM2 process 'special-fare' is online"
else
  err "PM2 process 'special-fare' is: ${PM2_STATUS:-not found}"
  echo "      Fix: pm2 start .next/standalone/start.sh --name special-fare"
fi

hr "2. Is the app responding on port 3000?"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000/)
if [[ "$HTTP_CODE" == "200" ]]; then
  ok "App responds on :3000 (HTTP 200)"
else
  err "App responds with HTTP ${HTTP_CODE} on :3000"
  echo "      Check: pm2 logs special-fare --lines 30"
fi

hr "3. Does .env exist and have the required vars?"
if [[ -f .env ]]; then
  ok ".env file present"
  grep -qE "^DATABASE_URL=" .env && ok "DATABASE_URL is set" || err "DATABASE_URL is MISSING in .env"
  grep -qE "^SESSION_SECRET=" .env && ok "SESSION_SECRET is set" || err "SESSION_SECRET is MISSING in .env"
  grep -qE "^ADMIN_EMAIL=" .env && ok "ADMIN_EMAIL is set ($(grep ^ADMIN_EMAIL= .env | cut -d= -f2))" || warn "ADMIN_EMAIL not in .env (seed would use demo admin)"
  grep -qE "^ADMIN_PASSWORD=" .env && ok "ADMIN_PASSWORD is set" || warn "ADMIN_PASSWORD not in .env (seed would use password123)"
  SECRET_LEN=$(grep ^SESSION_SECRET= .env | cut -d= -f2 | wc -c)
  if [[ "$SECRET_LEN" -lt 32 ]]; then
    warn "SESSION_SECRET looks short ($((SECRET_LEN-1)) chars) — regenerate: openssl rand -hex 32"
  fi
else
  err ".env file NOT FOUND in $APP_DIR"
  echo "      Fix: see deploy/DEPLOY.md — create .env with DATABASE_URL, SESSION_SECRET, PORT"
fi

hr "4. Does the database exist / have data?"
DB_URL=$(grep ^DATABASE_URL= .env 2>/dev/null | sed 's/^DATABASE_URL=//')
if [[ "$DB_URL" == postgresql://* ]] || [[ "$DB_URL" == postgres://* ]]; then
  ok "Using PostgreSQL (Supabase): ${DB_URL#@*}"
  info "Checking tables via Prisma..."
  if npx --no-install prisma db execute --stdin <<<"SELECT COUNT(*) AS users FROM \"User\";" 2>/dev/null | tail -3; then
    ok "DB connection works"
  else
    warn "Could not query DB via prisma. Test the connection string in .env manually."
  fi
elif [[ -n "$DB_URL" ]]; then
  DB_PATH="${DB_URL#file:}"
  if [[ -n "$DB_PATH" && -f "$DB_PATH" ]]; then
    ok "SQLite DB file exists: $DB_PATH ($(du -h "$DB_PATH" | cut -f1))"
    if command -v sqlite3 &>/dev/null; then
      USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM User;" 2>/dev/null || echo "ERR")
      ADMIN_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM User WHERE role='ADMIN';" 2>/dev/null || echo "ERR")
      ok "DB has $USER_COUNT users ($ADMIN_COUNT admins)"
      if [[ "$ADMIN_COUNT" == "0" ]]; then
        err "NO ADMIN USER — this is why login fails!"
        echo "      Fix: npx tsx scripts/create-admin.ts"
      fi
      echo "      Users in DB:"
      sqlite3 "$DB_PATH" "SELECT email, role, CASE WHEN active THEN 'active' ELSE 'suspended' END FROM User;" 2>/dev/null | sed 's/^/        /'
    else
      warn "sqlite3 CLI not installed — install: apt install -y sqlite3"
    fi
  else
    err "SQLite file NOT FOUND at: ${DB_PATH}"
    echo "      Fix: npx prisma db push"
  fi
else
  err "DATABASE_URL not set in .env"
fi

hr "5. Test the login API directly"
echo "  Enter the admin email to test [admin@specialfare.com]:"
read -r TEST_EMAIL
  TEST_EMAIL="${TEST_EMAIL:-admin@specialfare.com}"
echo "  Enter password (input hidden):"
read -rs TEST_PASS
  echo
LOGIN_RESP=$(curl -s --max-time 8 -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" \
  -w "\n__HTTP__%{http_code}")
LOGIN_HTTP=$(echo "$LOGIN_RESP" | grep -oP '__HTTP__\K\d+')
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed 's/__HTTP__\d*$//')
if [[ "$LOGIN_HTTP" == "200" ]]; then
  ok "LOGIN SUCCESS (HTTP 200) for $TEST_EMAIL"
elif [[ "$LOGIN_HTTP" == "401" ]]; then
  err "LOGIN REJECTED (HTTP 401) — wrong email/password, OR user doesn't exist"
  echo "      Body: $LOGIN_BODY"
  echo "      → If the user doesn't exist: npx tsx scripts/create-admin.ts"
  echo "      → If password is wrong: set ADMIN_PASSWORD in .env, re-run create-admin.ts"
elif [[ "$LOGIN_HTTP" == "500" ]]; then
  err "LOGIN SERVER ERROR (HTTP 500) — check app logs: pm2 logs special-fare --lines 30"
  echo "      Body: $LOGIN_BODY"
  echo "      Common cause: DATABASE_URL not loaded into the Node process (check .next/standalone/start.sh + .env)"
else
  err "LOGIN returned HTTP ${LOGIN_HTTP:-000}"
  echo "      Body: $LOGIN_BODY"
fi

hr "6. Recent PM2 errors (last 20 lines)"
pm2 logs special-fare --lines 20 --nostream 2>&1 | tail -25

hr "7. Does the standalone start.sh wrapper exist?"
if [[ -f .next/standalone/start.sh ]]; then
  ok ".next/standalone/start.sh exists"
else
  err ".next/standalone/start.sh MISSING — env vars won't load!"
  echo "      Fix: recreate it — see deploy/update.sh step 5, or re-run deploy.sh"
fi
if [[ -f .next/standalone/.env ]]; then
  ok ".next/standalone/.env exists (env will be loaded by start.sh)"
else
  err ".next/standalone/.env MISSING — copy it: cp .env .next/standalone/.env"
fi

echo -e "\n${BOLD}${GREEN}Diagnostic complete.${NC} Address any ✗ items above, then retry login.\n"
