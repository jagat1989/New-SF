import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// BULLETPROOF .env loader — tries every possible location.
// Next.js standalone server.js does NOT auto-load .env files. This ensures
// DATABASE_URL is available no matter how the app is started or where it runs.
// ─────────────────────────────────────────────────────────────────────────────
function loadEnvFile() {
  if (process.env.DATABASE_URL) return // already set (e.g. by Render/Vercel dashboard)

  try {
    const { readFileSync, existsSync } = require('fs')
    const { resolve } = require('path')

    const candidates = new Set<string>([
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '../.env'),
      resolve(process.cwd(), '../../.env'),
      resolve(process.cwd(), '../../../.env'),
    ])

    try {
      candidates.add(resolve(__dirname, '.env'))
      candidates.add(resolve(__dirname, '../.env'))
      candidates.add(resolve(__dirname, '../../.env'))
      candidates.add(resolve(__dirname, '../../../.env'))
      candidates.add(resolve(__dirname, '../../../../.env'))
    } catch {}

    const absPaths = [
      '/var/www/special-fare/.env',
      '/var/www/special-fare/.next/standalone/.env',
      '/app/.env',
      '/opt/app/.env',
      '/home/app/.env',
    ]
    for (const p of absPaths) candidates.add(p)

    for (const p of candidates) {
      try {
        if (existsSync(p)) {
          const raw = readFileSync(p, 'utf8')
          for (const line of raw.split('\n')) {
            const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
            if (!m) continue
            const key = m[1]
            const val = m[2].replace(/^["']|["']$/g, '').trim()
            if (process.env[key] === undefined) process.env[key] = val
          }
          // eslint-disable-next-line no-console
          console.log(`[db] loaded .env from ${p}`)
          return
        }
      } catch {}
    }
    // eslint-disable-next-line no-console
    console.warn('[db] WARNING: no .env file found. DATABASE_URL must be set by the hosting platform.')
  } catch {}
}

loadEnvFile()

// ─────────────────────────────────────────────────────────────────────────────
// Create PrismaClient with an EXPLICIT datasourceUrl.
// This bypasses Prisma's env("DATABASE_URL") validation entirely — we pass
// the URL directly at runtime. Works even if the schema's env() lookup fails
// during `next build` (common on Render where env vars are runtime-only).
// ─────────────────────────────────────────────────────────────────────────────
const datasourceUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_NON_POOLING

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
