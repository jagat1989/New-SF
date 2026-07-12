import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// Diagnostic endpoint — returns the app's view of the database.
// Visit /api/db-check on your live site to see what's wrong.
// NO AUTH REQUIRED (it only reveals counts + the DATABASE_URL host, not secrets).
export async function GET() {
  const out: Record<string, any> = {}

  // 0. Where is the app running from? (critical for finding .env)
  out.process_cwd = process.cwd()
  out.node_env = process.env.NODE_ENV
  try { out.__dirname = __dirname } catch { out.__dirname = '(unavailable)' }

  // 1. What DATABASE_URL is the app using? (mask the password)
  const dbUrl = process.env.DATABASE_URL || '(not set)'
  const masked = dbUrl.replace(/(:\/\/[^:]+:)[^@]+@/, '$1****@')
  out.DATABASE_URL_masked = masked
  out.DATABASE_URL_set = !!process.env.DATABASE_URL

  // 2. Which .env files exist? (helps diagnose the "env not found" issue)
  try {
    const { existsSync } = require('fs')
    const { resolve } = require('path')
    const candidates = [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '../.env'),
      resolve(process.cwd(), '../../.env'),
      '/var/www/special-fare/.env',
      '/var/www/special-fare/.next/standalone/.env',
      '/app/.env',
    ]
    out.env_files = candidates.map((p: string) => ({ path: p, exists: existsSync(p) }))
  } catch {}

  // 3. Can we connect + query?
  try {
    const userCount = await db.user.count()
    out.db_connected = true
    out.user_count = userCount

    const adminCount = await db.user.count({ where: { role: 'ADMIN' } })
    out.admin_count = adminCount

    const targetAdmin = await db.user.findUnique({
      where: { email: 'specialfare21@gmail.com' },
      select: { email: true, role: true, active: true, passwordHash: true },
    })
    if (targetAdmin) {
      out.target_admin = {
        email: targetAdmin.email,
        role: targetAdmin.role,
        active: targetAdmin.active,
        passwordHash_length: targetAdmin.passwordHash?.length || 0,
        passwordHash_starts_with: targetAdmin.passwordHash?.slice(0, 20) || '(empty)',
        passwordHash_is_empty: !targetAdmin.passwordHash || targetAdmin.passwordHash === '',
      }
    } else {
      out.target_admin = null
      out.issue = 'The app cannot find specialfare21@gmail.com in the database it is connected to.'
    }
  } catch (e: any) {
    out.db_connected = false
    out.db_error = e?.message || String(e)
    out.db_error_code = e?.code || '(none)'
    out.issue = 'The app CANNOT connect to the database. Check DATABASE_URL in .env.'
  }

  return NextResponse.json(out, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}
