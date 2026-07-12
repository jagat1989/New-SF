import type { SessionUser, Flight, FixedDeparture, Booking, Payment } from '@/lib/types'

async function jfetch(url: string, opts: RequestInit = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`)
  return data
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      jfetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }) as Promise<{ user: SessionUser }>,
    register: (d: { name: string; email: string; password: string; role: string; phone?: string; company?: string }) =>
      jfetch('/api/auth/register', { method: 'POST', body: JSON.stringify(d) }) as Promise<{ user: SessionUser }>,
    logout: () => jfetch('/api/auth/logout', { method: 'POST' }),
    me: () => jfetch('/api/auth/me') as Promise<{ user: SessionUser | null }>,
  },
  flights: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return jfetch('/api/flights' + q) as Promise<{ flights: Flight[] }>
    },
    create: (d: Partial<Flight>) => jfetch('/api/flights', { method: 'POST', body: JSON.stringify(d) }) as Promise<{ flight: Flight }>,
    update: (id: string, d: Partial<Flight>) => jfetch(`/api/flights/${id}`, { method: 'PUT', body: JSON.stringify(d) }) as Promise<{ flight: Flight }>,
    remove: (id: string) => jfetch(`/api/flights/${id}`, { method: 'DELETE' }),
  },
  departures: {
    list: (params?: Record<string, string>) => {
      const q = params ? '?' + new URLSearchParams(params).toString() : ''
      return jfetch('/api/fixed-departures' + q) as Promise<{ departures: FixedDeparture[] }>
    },
    create: (d: any) => jfetch('/api/fixed-departures', { method: 'POST', body: JSON.stringify(d) }) as Promise<{ departure: FixedDeparture }>,
    update: (id: string, d: any) => jfetch(`/api/fixed-departures/${id}`, { method: 'PUT', body: JSON.stringify(d) }) as Promise<{ departure: FixedDeparture }>,
    remove: (id: string) => jfetch(`/api/fixed-departures/${id}`, { method: 'DELETE' }),
  },
  bookings: {
    list: () => jfetch('/api/bookings') as Promise<{ bookings: Booking[] }>,
    create: (d: any) => jfetch('/api/bookings', { method: 'POST', body: JSON.stringify(d) }) as Promise<{ booking: Booking; payment: Payment }>,
  },
  payments: {
    qr: (bookingId: string) => jfetch('/api/payments/qr', { method: 'POST', body: JSON.stringify({ bookingId }) }) as Promise<{ payment: Payment; qrDataUrl: string; booking: any }>,
    verify: (paymentId: string) => jfetch('/api/payments/verify', { method: 'POST', body: JSON.stringify({ paymentId }) }) as Promise<{ payment: Payment; transactionId: string }>,
  },
  users: {
    list: () => jfetch('/api/users') as Promise<{ users: any[] }>,
    create: (d: any) => jfetch('/api/users', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: any) => jfetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id: string) => jfetch(`/api/users/${id}`, { method: 'DELETE' }),
  },
  stats: () => jfetch('/api/stats') as Promise<any>,
  settings: {
    get: (reveal = false) => jfetch('/api/settings' + (reveal ? '?reveal=1' : '')) as Promise<{ settings: Record<string, any>; schema: any }>,
    update: (settings: Record<string, string>) => jfetch('/api/settings', { method: 'PUT', body: JSON.stringify({ settings }) }) as Promise<{ ok: boolean; settings: Record<string, any> }>,
    test: (channel: 'payment' | 'email' | 'whatsapp', target?: string) =>
      jfetch('/api/settings/test', { method: 'POST', body: JSON.stringify({ channel, target }) }) as Promise<{ ok: boolean; message: string; meta?: any }>,
  },
}

export function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
