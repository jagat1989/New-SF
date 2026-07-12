import { PrismaClient } from '@prisma/client'

// Auto-load .env if DATABASE_URL isn't already in the environment.
// Next.js standalone server.js does NOT auto-load .env files, so when the app
// is started directly (e.g. `node server.js` or `pm2 start server.js` without
// the start.sh wrapper), env vars are missing. This reads .env from a few
// likely locations and injects the vars into process.env before Prisma reads them.
if (!process.env.DATABASE_URL) {
  try {
    const { readFileSync, existsSync } = require('fs')
    const { resolve } = require('path')
    // Try a few common locations: cwd, standalone dir, parent (app root)
    const candidates = [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '../.env'),
      resolve(process.cwd(), '../../.env'),
      resolve(__dirname, '.env'),
      resolve(__dirname, '../.env'),
      resolve(__dirname, '../../.env'),
    ]
    for (const p of candidates) {
      if (existsSync(p)) {
        const raw = readFileSync(p, 'utf8')
        for (const line of raw.split('\n')) {
          const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const key = m[1]
          let val = m[2].replace(/^["']|["']$/g, '')
          if (process.env[key] === undefined) process.env[key] = val
        }
        // eslint-disable-next-line no-console
        console.log(`[db] loaded env from ${p}`)
        break
      }
    }
  } catch {
    // ignore — Prisma will throw a clear error if DATABASE_URL is still missing
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
