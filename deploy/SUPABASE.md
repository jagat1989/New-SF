# Special Fare on Supabase — Setup Guide

This guide shows how to connect the Special Fare app to your **Supabase PostgreSQL** database instead of local SQLite.

> ✅ Recommended for production — Supabase gives you a managed Postgres DB with backups, connection pooling, and a dashboard.

---

## Prerequisites

- A Supabase project (you already have one: `iqqaafsyhpwfuucueftz`)
- The project code deployed somewhere (your laptop, or a Hostinger VPS)

---

## Step 1 — Get your connection strings from Supabase

1. Log into **https://supabase.com** → open your project
2. Left sidebar → **Project Settings** (⚙ gear icon) → **Database**
3. Under **Connection string**, click **URI**
4. You'll see two URLs — copy both:

### a) Session pooler (for the running app — pooled, fast)
```
postgresql://postgres.iqqaafsyhpwfuucueftz:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### b) Direct connection (for migrations — bypasses the pooler)
```
postgresql://postgres.iqqaafsyhpwfuucueftz:[YOUR-PASSWORD]@aws-0-[region].supabase.com:5432/postgres
```

> Replace `[YOUR-PASSWORD]` with the database password you set when creating the Supabase project. If you forgot it: Supabase → Project Settings → Database → **Reset database password**.

> ⚠️ The pooler URL has `.pooler.` in the host; the direct URL does not. The direct URL is needed because Prisma migrations don't work through PgBouncer's transaction-mode pooler.

---

## Step 2 — Update `.env` on your server (or laptop)

In your project root, edit `.env` (create it from `.env.example` if missing):

```bash
# Use the Supabase Session pooler URL here (with .pooler. in the host)
DATABASE_URL=postgresql://postgres.iqqaafsyhpwfuucueftz:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres

# Use the Supabase Direct URL here (NO .pooler. in the host)
DATABASE_URL_NON_POOLING=postgresql://postgres.iqqaafsyhpwfuucueftz:YOUR_PASSWORD@aws-0-region.supabase.com:5432/postgres

# Session secret (generate with: openssl rand -hex 32)
SESSION_SECRET=your-generated-secret-here

# Admin account (created by the seed script)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_NAME=Special Fare Admin

NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
```

**Important:** never commit `.env` to git. It's already in `.gitignore`.

---

## Step 3 — Confirm the Prisma provider is `postgresql`

The schema is already configured for Postgres. Verify `prisma/schema.prisma` has:

```prisma
datasource db {
  provider = "postgresql"   // ← must be postgresql, not sqlite
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_NON_POOLING")
}
```

(Already done in this repo.)

---

## Step 4 — Create the tables in Supabase

From your project directory:

```bash
# Generate the Prisma client
npx prisma generate

# Push the schema to Supabase (creates all tables)
npx prisma db push
```

You should see: `🚀  Your database is now in sync with your Prisma schema.`

Verify in Supabase: Dashboard → **Table Editor** — you'll see `User`, `Flight`, `FixedDeparture`, `Booking`, `Payment`, `Setting` tables.

---

## Step 5 — Seed the data (flights, users, your admin)

```bash
# The seed reads ADMIN_EMAIL/ADMIN_PASSWORD from .env and creates the admin
npx tsx scripts/seed.ts
```

You'll see:
```
✓ Admin created: you@example.com
Seed complete.
```

Verify in Supabase: Dashboard → **Table Editor** → `User` table — you'll see 8 users including your admin.

> If `tsx` isn't installed: `npm install -g tsx`, then re-run.

---

## Step 6 — Build & run

```bash
npm run build
npm start
# OR with PM2 (production):
pm2 start .next/standalone/start.sh --name special-fare
```

Test login at your app with `you@example.com` / `choose-a-strong-password` → should land on the admin dashboard.

---

## Using Supabase instead of SQLite on the Hostinger VPS

If you're deploying via `deploy/deploy.sh` to a Hostinger VPS and want Supabase instead of local SQLite:

1. Run `bash deploy/deploy.sh` as normal (it sets up Node, PM2, Nginx, SSL)
2. After it finishes, edit the server's `.env`:
   ```bash
   ssh root@YOUR_VPS_IP
   nano /var/www/special-fare/.env
   # Replace the DATABASE_URL line with your Supabase URLs (both pooled + direct)
   # Add ADMIN_EMAIL / ADMIN_PASSWORD
   ```
3. Push the schema to Supabase + seed:
   ```bash
   cd /var/www/special-fare
   npx prisma generate
   npx prisma db push
   npx tsx scripts/seed.ts
   ```
4. Restart the app:
   ```bash
   pm2 restart special-fare
   ```

---

## Switching back to SQLite (if needed)

If you ever want local SQLite again:

1. In `prisma/schema.prisma`, change `provider = "postgresql"` → `provider = "sqlite"` and remove the `directUrl` line
2. In `.env`, set `DATABASE_URL=file:./db/custom.db`
3. `npx prisma db push && npx tsx scripts/seed.ts`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Error: P1001: Can't reach database server` | Check the host in your URL — pooler uses `.pooler.supabase.com`, direct uses `.supabase.com`. Verify your VPS/firewall allows outbound 5432. |
| `Error: P1010: User was denied access` | Wrong database password. Reset it in Supabase → Project Settings → Database → Reset password. |
| `Error: P3009: migrate could not create migration table` | You're using the pooler URL for migrations. Use the **direct** URL in `DATABASE_URL_NON_POOLING`. |
| `Error: prepared statement "s0" already exists` | PgBouncer transaction-mode issue. Make sure `directUrl` is set to the non-pooling URL (already configured). |
| Seed fails with `relation "User" does not exist` | You skipped `npx prisma db push`. Run it first to create tables. |
| Login fails after switching | The Supabase DB is empty — run `npx tsx scripts/seed.ts` (or `scripts/create-admin.ts`) to create the admin user. |

---

## Security notes

- **Never commit `.env`** — it contains your DB password. It's already in `.gitignore`.
- In Supabase, the `postgres` user has full admin access. For production, consider creating a restricted role via Supabase → Database → Roles (read/write on app tables only).
- Supabase free tier: 500 MB storage, 2 GB bandwidth — plenty for thousands of bookings. Upgrade to Pro ($25/mo) for daily backups and more.
