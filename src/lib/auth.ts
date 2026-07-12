import { db } from '@/lib/db'

export type Role = 'ADMIN' | 'SUPPLIER' | 'AGENT' | 'CUSTOMER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  phone?: string | null
  company?: string | null
  balance: number
  commissionRate: number
}

// Simple signed session cookie (base64 payload + HMAC signature)
const SECRET = process.env.SESSION_SECRET || 'specialfare-dev-secret-change-me'

async function hmac(data: string): Promise<string> {
  const { createHmac } = await import('crypto')
  return createHmac('sha256', SECRET).update(data).digest('hex')
}

export async function createSessionCookie(user: SessionUser): Promise<string> {
  const payload = JSON.stringify(user)
  const b64 = Buffer.from(payload).toString('base64url')
  const sig = await hmac(b64)
  return `${b64}.${sig}`
}

export async function verifySessionCookie(cookie: string): Promise<SessionUser | null> {
  try {
    const [b64, sig] = cookie.split('.')
    if (!b64 || !sig) return null
    const expected = await hmac(b64)
    if (sig !== expected) return null
    const payload = Buffer.from(b64, 'base64url').toString('utf8')
    const user = JSON.parse(payload) as SessionUser
    return user
  } catch {
    return null
  }
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/specialfare_session=([^;]+)/)
  if (!match) return null
  const sessionUser = await verifySessionCookie(match[1])
  if (!sessionUser) return null
  // refresh balance from DB
  const fresh = await db.user.findUnique({ where: { id: sessionUser.id } })
  if (!fresh || !fresh.active) return null
  return {
    ...sessionUser,
    name: fresh.name,
    role: fresh.role as Role,
    balance: fresh.balance,
    commissionRate: fresh.commissionRate,
    phone: fresh.phone,
    company: fresh.company,
  }
}

// Password hashing using Node built-in crypto.scrypt (no external deps)
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export async function hashPassword(p: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(p, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(p: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const hashBuf = Buffer.from(hash, 'hex')
    const testBuf = scryptSync(p, salt, 64)
    if (hashBuf.length !== testBuf.length) return false
    return timingSafeEqual(hashBuf, testBuf)
  } catch {
    return false
  }
}

export function toSessionUser(u: {
  id: string
  email: string
  name: string
  role: string
  phone?: string | null
  company?: string | null
  balance: number
  commissionRate: number
}): SessionUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    phone: u.phone ?? null,
    company: u.company ?? null,
    balance: u.balance,
    commissionRate: u.commissionRate,
  }
}

export const SESSION_COOKIE = 'specialfare_session'

export function sessionCookieOptions() {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
}
