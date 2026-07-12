# Special Fare — Deployment Guide

Deploy **Special Fare** (Next.js 16 + SQLite) to a **Hostinger VPS** running Ubuntu 22.04 / 24.04.

---

## Prerequisites

1. **Hostinger VPS** (KVM, 1 vCPU / 4 GB RAM minimum) with **Ubuntu 22.04 or 24.04**
2. A **domain name** pointed at the VPS IP (optional but recommended for SSL)
3. Your project code in a **git repo** (GitHub / GitLab / Bitbucket) — or uploadable via SCP

> ⚠️ This app uses Node.js API routes + SQLite, so it **cannot run on Hostinger's cheapest shared hosting**. You need a VPS that gives you a long-running Node process.

---

## Quick deploy (one-shot)

SSH into your fresh VPS as root, clone the repo, and run the deploy script:

```bash
ssh root@YOUR_SERVER_IP

# Get the code onto the server (any location works — the script moves it)
apt update && apt install -y git
git clone https://github.com/YOUR_USERNAME/special-fare.git /tmp/sf
cd /tmp/sf

# Run the one-shot deploy script
sudo bash deploy/deploy.sh
```

The script will prompt you for:

| Prompt | Example | Notes |
|--------|---------|-------|
| Git repo URL | `https://github.com/you/special-fare.git` | Or leave empty if you uploaded code manually to `/var/www/special-fare` |
| Domain name | `specialfare.com` | Leave empty to skip Nginx/SSL (access via `http://IP:3000`) |
| Admin email | `admin@specialfare.com` | Used for the admin account + Let's Encrypt registration |

The script does **everything**: installs Node 20, PM2, Nginx, UFW; clones the repo; generates a secure `SESSION_SECRET`; builds; starts PM2; configures Nginx; issues a free SSL certificate. **~5 minutes end-to-end.**

---

## What the deploy script sets up

```
Internet ──► Nginx :80/:443 ──► Node.js :3000 (PM2) ──► SQLite /var/www/special-fare/db/custom.db
                  │
                  └─ serves /_next/static/ directly (cached 365 days)
```

| Component | Purpose |
|-----------|---------|
| **Node.js 20 LTS** | Runs the Next.js standalone server |
| **PM2** | Keeps the app alive 24/7, restarts on crash & reboot |
| **Nginx** | Reverse proxy + serves static assets + SSL termination |
| **UFW** | Firewall — only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open |
| **Certbot** | Free Let's Encrypt SSL certificate (auto-renews) |
| **SQLite** | Database at `/var/www/special-fare/db/custom.db` |

---

## After deploying

### Verify it works
```bash
pm2 status                    # app should be "online"
pm2 logs special-fare         # no errors
curl http://localhost:3000/   # returns HTML
```

Then visit **`https://yourdomain.com`** and log in:
- Admin: `admin@specialfare.com` / `password123`
- **Change the admin password immediately** after first login.

### Set up daily database backups
```bash
crontab -e
# add this line for a 2 AM daily backup (keeps 14 days):
0 2 * * * /var/www/special-fare/deploy/backup.sh >> /var/log/sf-backup.log 2>&1
```

---

## Updating the app after code changes

Whenever you push new code to git, update the server:

```bash
ssh root@YOUR_SERVER_IP
cd /var/www/special-fare
sudo bash deploy/update.sh
```

`update.sh` does: `git pull` → `npm install` → `prisma generate` → `prisma db push` → `npm run build` → `pm2 restart`. ~1 minute.

---

## Common commands

```bash
# Logs
pm2 logs special-fare              # live tail
pm2 logs special-fare --lines 100  # last 100 lines

# Restart / stop / start
pm2 restart special-fare
pm2 stop special-fare
pm2 start special-fare

# PM2 dashboard (CPU, memory, uptime)
pm2 monit

# Inspect the database
sqlite3 /var/www/special-fare/db/custom.db
sqlite3 /var/www/special-fare/db/custom.db "SELECT email, role FROM User;"

# Nginx
sudo nginx -t                     # test config
sudo systemctl reload nginx       # apply config changes
sudo tail -f /var/log/nginx/access.log

# SSL certificate
sudo certbot certificates         # list certs
sudo certbot renew --dry-run      # test auto-renewal

# Restore a backup
gunzip < /var/backups/special-fare/special-fare-20250115-020000.db.gz | sqlite3 /var/www/special-fare/db/custom.db
```

---

## Manual setup (if you prefer not to use the one-shot script)

<details>
<summary>Click to expand step-by-step manual instructions</summary>

### 1. Install prerequisites
```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx ufw sqlite3 build-essential git
npm install -g pm2
```

### 2. Get the code & configure
```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/you/special-fare.git
cd special-fare
mkdir -p db && chown -R www-data:www-data db

cat > .env <<EOF
DATABASE_URL=file:/var/www/special-fare/db/custom.db
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
EOF
```

### 3. Install, build, start
```bash
npm install
npx prisma generate
npx prisma db push
npx tsx scripts/seed.ts          # optional: load demo data
npm run build

cd .next/standalone
pm2 start server.js --name special-fare
pm2 save && pm2 startup
```

### 4. Nginx + SSL
```bash
cp deploy/nginx.conf /etc/nginx/sites-available/special-fare
# edit the server_name in that file to your domain
ln -s /etc/nginx/sites-available/special-fare /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable

# SSL
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

</details>

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Site won't load** | `pm2 logs special-fare` — look for errors. Common: missing `.env`, wrong `DATABASE_URL` path |
| **502 Bad Gateway** | App isn't running on port 3000. `pm2 restart special-fare` then check `curl http://localhost:3000/` |
| **Database locked / errors** | Make sure `db/` is writable by `www-data`: `chown -R www-data:www-data /var/www/special-fare/db` |
| **Certbot fails** | DNS hasn't propagated. Verify `ping yourdomain.com` resolves to your VPS IP, then re-run `certbot --nginx -d yourdomain.com` |
| **App dies after reboot** | Run `pm2 startup` and follow the printed command, then `pm2 save` |
| **Build fails (sharp/native)** | `apt install -y build-essential python3` then `npm rebuild` |
| **Port 3000 unreachable externally** | Correct — only 80/443 are exposed. Nginx proxies internally. Don't open 3000 in UFW |

---

## Scaling notes

- **SQLite** handles thousands of bookings comfortably. If you outgrow it, switch to MySQL/MariaDB:
  ```bash
  apt install -y mariadb-server
  mysql -e "CREATE DATABASE specialfare; CREATE USER 'sf'@'localhost' IDENTIFIED BY 'strongpass'; GRANT ALL ON specialfare.* TO 'sf'@'localhost';"
  ```
  Then update `DATABASE_URL` in `.env` to `mysql://sf:strongpass@localhost:3306/specialfare` and run `npx prisma db push`.

- **Memory**: the 4 GB VPS plan is plenty. If you see OOM kills in `pm2 logs`, upgrade to 8 GB or add swap:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

---

## File structure on the server

```
/var/www/special-fare/
├── .env                          # DATABASE_URL, SESSION_SECRET, PORT
├── .next/standalone/server.js    # the production Node server (run by PM2)
├── db/custom.db                  # SQLite database (back this up!)
├── deploy/
│   ├── deploy.sh                 # one-shot setup
│   ├── update.sh                 # pull & rebuild
│   ├── backup.sh                 # SQLite backup
│   └── nginx.conf                # Nginx config reference
├── src/                          # source code
├── prisma/schema.prisma          # database schema
└── package.json
```
