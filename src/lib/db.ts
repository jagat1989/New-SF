import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// BULLETPROOF .env loader — tries every possible location
// Next.js standalone server.js does NOT auto-load .env files. This ensures
// DATABASE_URL is available no matter how the app is started or where it runs.
// ─────────────────────────────────────────────────────────────────────────────
function loadEnvFile() {
  if (process.env.DATABASE_URL) return // already set (e.g. by hosting platform)

  try {
    const { readFileSync, existsSync } = require('fs')
    const { resolve } = require('path')

    // Collect every plausible .env location
    const candidates = new Set<string>([
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '../.env'),
      resolve(process.cwd(), '../../.env'),
      resolve(process.cwd(), '../../../.env'),
    ])

    // __dirname-based paths (works inside .next/standalone bundles)
    try {
      candidates.add(resolve(__dirname, '.env'))
      candidates.add(resolve(__dirname, '../.env'))
      candidates.add(resolve(__dirname, '../../.env'))
      candidates.add(resolve(__dirname, '../../../.env'))
      candidates.add(resolve(__dirname, '../../../../.env'))
      candidates.add(resolve(__dirname, '../../../../../.env'))
    } catch {}

    // Common absolute paths on VPS deploys
    const absPaths = [
      '/var/www/special-fare/.env',
      '/var/www/special-fare/.next/standalone/.env',
      '/app/.env',           // Render/Railway container default
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
          return // success
        }
      } catch {
        // try next candidate
      }
    }
    // eslint-disable-next-line no-console
    console.warn('[db] WARNING: no .env file found in any location. DATABASE_URL is missing.')
  } catch {
    // ignore
  }
}

loadEnvFile()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
