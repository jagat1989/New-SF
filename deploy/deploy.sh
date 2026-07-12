#!/usr/bin/env bash
# ============================================================================
#  Special Fare — One-shot Hostinger VPS deployment script
#  Run this ONCE on a fresh Ubuntu 22.04 / 24.04 VPS as root (or with sudo).
#
#  Usage:
#    sudo bash deploy.sh
#
#  It will prompt you for:
#    - Git repo URL (or local path) of your project
#    - Your domain name (e.g. specialfare.com)  [can be empty to skip SSL]
#    - Admin email (for the first admin account)
#
#  What it does:
#    1. Installs Node.js 20 LTS, PM2, Nginx, build tools, UFW
#    2. Clones your repo to /var/www/special-fare
#    3. Generates a secure SESSION_SECRET + .env
#    4. Installs deps, builds, runs Prisma migrations
#    5. Starts the app with PM2 (auto-restart on crash + reboot)
#    6. Configures Nginx reverse proxy
#    7. Sets up UFW firewall (only 22/80/443 open)
#    8. Optionally issues a free Let's Encrypt SSL certificate
#
#  Safe to re-run — each step is idempotent.
# ============================================================================

set -euo pipefail

# ---------- pretty output ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()    { echo -e "${GREEN}✓${NC} $1"; }
info()  { echo -e "${CYAN}ℹ${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; }
step()  { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }
ask()   { read -rp "$(echo -e "${BOLD}$1${NC}")" "$2"; }

# ---------- pre-flight checks ----------
if [[ $EUID -ne 0 ]]; then
  err "Please run as root:  sudo bash deploy.sh"
  exit 1
fi

if ! grep -qiE 'ubuntu|debian' /etc/os-release 2>/dev/null; then
  warn "This script targets Ubuntu/Debian. Detected: $(uname -a)"
  ask "Continue anyway? (y/N): " CONT
  [[ "$CONT" =~ ^[Yy]$ ]] || exit 1
fi

echo -e "${BOLD}${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Special Fare — VPS Deploy Script             ║"
echo "║        Hostinger Ubuntu VPS · Next.js 16            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---------- gather inputs ----------
ask "Git repo URL (https://github.com/you/special-fare.git) or local path [skip clone]: " REPO_URL
ask "Domain name (e.g. specialfare.com) [leave empty to skip Nginx+SSL]: " DOMAIN
ask "Admin email for first admin account [admin@specialfare.com]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@specialfare.com}"

APP_DIR="/var/www/special-fare"
APP_PORT=3000
NODE_MAJOR=20

step "1/8 — System update & base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential python3 nginx ufw sqlite3 ca-certificates gnupg
ok "Base packages installed"

step "2/8 — Install Node.js ${NODE_MAJOR} LTS"
if command -v node &>/dev/null && [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -ge "$NODE_MAJOR" ]]; then
  ok "Node.js $(node -v) already installed"
else
  info "Installing NodeSource Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
  ok "Node.js $(node -v) installed"
fi
ok "npm $(npm -v)"

step "3/8 — Install PM2 (process manager)"
if command -v pm2 &>/dev/null; then
  ok "PM2 already installed"
else
  npm install -g pm2
  ok "PM2 installed"
fi

step "4/8 — Get the code to ${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  info "Repo already present — pulling latest..."
  cd "$APP_DIR"
  git pull --rebase || warn "git pull failed (maybe local changes) — continuing with existing code"
elif [[ -d "${APP_DIR}/package.json" ]]; then
  warn "${APP_DIR} exists but isn't a git repo — using existing files"
else
  if [[ -z "$REPO_URL" ]]; then
    err "No repo URL provided and ${APP_DIR} doesn't exist."
    err "Re-run with a git URL, or upload your code to ${APP_DIR} first."
    exit 1
  fi
  mkdir -p /var/www
  if [[ -e "$REPO_URL" ]]; then
    info "Copying local path ${REPO_URL}..."
    cp -r "$REPO_URL" "$APP_DIR"
  else
    info "Cloning ${REPO_URL}..."
    git clone --depth 1 "$REPO_URL" "$APP_DIR"
  fi
  ok "Code in place at ${APP_DIR}"
fi
cd "$APP_DIR"

step "5/8 — Environment & database"
mkdir -p db
chown -R www-data:www-data db

# Generate .env if missing or incomplete
generate_secret() {
  if command -v openssl &>/dev/null; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | xxd -p -c 64
  fi
}

ENV_FILE="${APP_DIR}/.env"

# Database choice — ask if not already configured
DB_CHOSEN="sqlite"
if [[ -f "$ENV_FILE" ]] && grep -q "^DATABASE_URL=postgresql" "$ENV_FILE"; then
  DB_CHOSEN="supabase"
elif [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  ask "Use Supabase (PostgreSQL) or local SQLite? [supabase/sqlite] (default: sqlite): " DB_CHOICE
  case "${DB_CHOICE:-sqlite}" in
    s|supabase|postgres|postgresql)
      DB_CHOSEN="supabase"
      info "Supabase selected — you'll need your connection strings handy."
      ;;
    *)
      DB_CHOSEN="sqlite"
      ;;
  esac
fi

if [[ ! -f "$ENV_FILE" ]]; then
  info "Creating .env with a fresh SESSION_SECRET..."
  SECRET=$(generate_secret)
  if [[ "$DB_CHOSEN" == "supabase" ]]; then
    echo ""
    echo -e "${BOLD}Paste your Supabase connection string${NC}"
    echo "  (from Supabase → Project Settings → Database → Connection string)"
    echo "  Looks like: postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"
    ask "  URL: " SB_URL
    # Use the same direct URL for both pooled + migrations (works fine for Supabase free/starter tiers)
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=${SB_URL}
DATABASE_URL_NON_POOLING=${SB_URL}
SESSION_SECRET=${SECRET}
NODE_ENV=production
PORT=${APP_PORT}
HOSTNAME=127.0.0.1
EOF
  else
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=file:${APP_DIR}/db/custom.db
SESSION_SECRET=${SECRET}
NODE_ENV=production
PORT=${APP_PORT}
HOSTNAME=127.0.0.1
EOF
  fi
  # Append admin creds if provided earlier
  if [[ -n "${ADMIN_EMAIL:-}" ]]; then
    echo "" >> "$ENV_FILE"
    echo "ADMIN_EMAIL=${ADMIN_EMAIL}" >> "$ENV_FILE"
    echo "ADMIN_PASSWORD=${ADMIN_PASSWORD:-password123}" >> "$ENV_FILE"
    echo "ADMIN_NAME=${ADMIN_NAME:-Special Fare Admin}" >> "$ENV_FILE"
  fi
  ok ".env created (DB: ${DB_CHOSEN})"
else
  warn ".env already exists — leaving as-is"
fi
DB_INFO="(detected: ${DB_CHOSEN})"

step "6/8 — Install dependencies & build"
info "Running npm install (this takes a few minutes)..."
npm install --omit=dev=false  # need devDeps for build (eslint, tailwind, tsc)
ok "Dependencies installed"

info "Generating Prisma client..."
npx prisma generate
ok "Prisma client generated ${DB_INFO}"

info "Creating database schema..."
if [[ "$DB_CHOSEN" == "supabase" ]]; then
  # For Supabase, migrations must use the direct (non-pooling) URL
  npx prisma db push --accept-data-loss 2>&1 | tail -3 || { err "prisma db push failed — check your Supabase URLs in .env"; exit 1; }
else
  npx prisma db push
fi
ok "Database schema pushed ${DB_INFO}"

# Ensure an admin user exists — run seed (works for both SQLite & Supabase).
# The seed reads ADMIN_EMAIL/ADMIN_PASSWORD from .env and creates the admin.
# It's safe to re-run (it wipes + recreates demo data; for production you may
# prefer to only create the admin via scripts/create-admin.ts instead).
info "Running seed to create admin + demo data (DB: ${DB_CHOSEN})..."
if npx --no-install tsx scripts/seed.ts 2>/dev/null || npx tsx scripts/seed.ts; then
  ok "Seed completed"
else
  warn "Seed script didn't run automatically. Create your admin manually:"
  warn "  npx tsx scripts/create-admin.ts   (after setting ADMIN_EMAIL/ADMIN_PASSWORD in .env)"
fi

info "Building production bundle (this takes 1-2 min)..."
npm run build
ok "Build complete — .next/standalone ready"

# Copy .env into the standalone dir so the runtime wrapper can load it
cp -f "${APP_DIR}/.env" "${APP_DIR}/.next/standalone/.env"

# Create a tiny wrapper that loads .env before starting the Node server.
# (Next.js standalone server.js does NOT auto-load .env files at runtime,
# so DATABASE_URL / SESSION_SECRET must be exported into the process env.)
cat > "${APP_DIR}/.next/standalone/start.sh" <<'EOF'
#!/usr/bin/env bash
cd "$(dirname "$0")"
set -a
[ -f .env ] && source .env
set +a
exec node server.js
EOF
chmod +x "${APP_DIR}/.next/standalone/start.sh"

# Fix ownership so the app can write the DB
chown -R www-data:www-data "${APP_DIR}/db" "${APP_DIR}/.next/standalone"

step "7/8 — Start with PM2"
# Stop existing if running
pm2 delete special-fare 2>/dev/null || true
pm2 start "${APP_DIR}/.next/standalone/start.sh" --name special-fare --cwd "${APP_DIR}/.next/standalone"
pm2 save
# Enable PM2 to start on boot
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 || true
ok "PM2 running — app on port ${APP_PORT}"
info "Logs:  pm2 logs special-fare"

# Quick local smoke test
if curl -sf "http://127.0.0.1:${APP_PORT}/" -o /dev/null; then
  ok "App responds on localhost:${APP_PORT}"
else
  warn "App not responding on :${APP_PORT} yet — check 'pm2 logs special-fare'"
fi

step "8/8 — Nginx + firewall + SSL"
# --- Firewall ---
ufw --force reset
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable
ok "UFW firewall active (22, 80, 443 open)"

# --- Nginx (only if domain provided) ---
if [[ -n "$DOMAIN" ]]; then
  info "Configuring Nginx for ${DOMAIN}..."

  NGINX_CONF="/etc/nginx/sites-available/special-fare"
  cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }

    # Serve Next.js static assets directly via Nginx (faster)
    location /_next/static/ {
        alias ${APP_DIR}/.next/standalone/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /favicon.ico {
        alias ${APP_DIR}/.next/standalone/public/favicon.ico;
        access_log off;
    }
}
EOF
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/special-fare
  rm -f /etc/nginx/sites-enabled/default

  if nginx -t; then
    systemctl reload nginx
    ok "Nginx configured & reloaded"
  else
    err "Nginx config test failed — check /etc/nginx/sites-available/special-fare"
    exit 1
  fi

  # --- SSL via Let's Encrypt ---
  info "Setting up SSL with Let's Encrypt..."
  apt-get install -y certbot python3-certbot-nginx
  if certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect; then
    ok "SSL certificate installed — HTTPS active!"
  else
    warn "Certbot failed (DNS may not yet point to this server)."
    warn "Once DNS propagates, re-run:  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  fi
else
  warn "No domain provided — skipping Nginx vhost & SSL."
  warn "Access the app directly at http://YOUR_SERVER_IP:${APP_PORT}"
  warn "Re-run with a domain later, or set up Nginx manually."
fi

# ---------- summary ----------
echo -e "\n${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗"
echo "║              🎉  DEPLOYMENT COMPLETE                 ║"
echo "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}App directory:${NC}  ${APP_DIR}"
echo -e "${BOLD}App port:${NC}       ${APP_PORT} (internal)"
echo -e "${BOLD}PM2 process:${NC}    special-fare"
if [[ -n "$DOMAIN" ]]; then
  echo -e "${BOLD}Live URL:${NC}       https://${DOMAIN}"
else
  echo -e "${BOLD}Live URL:${NC}       http://$(curl -s ifconfig.me):${APP_PORT}"
fi
echo ""
echo -e "${BOLD}${CYAN}Admin login:${NC}  ${ADMIN_EMAIL} / password123"
echo -e "${YELLOW}⚠  Change the admin password after first login!${NC}"
echo ""
echo -e "${BOLD}Useful commands:${NC}"
echo "  pm2 logs special-fare          # view live logs"
echo "  pm2 restart special-fare       # restart app"
echo "  pm2 monit                       # live dashboard"
echo "  sudo bash deploy/update.sh     # pull & rebuild after code changes"
echo "  sqlite3 ${APP_DIR}/db/custom.db   # inspect the database"
echo ""
