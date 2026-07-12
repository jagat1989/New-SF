import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// Keys considered sensitive — masked on GET unless ?reveal=1 is provided (still admin-only).
const SECRET_KEYS = new Set([
  'payment_api_key',
  'payment_api_secret',
  'payment_salt',
  'email_password',
  'whatsapp_token',
  'whatsapp_app_secret',
])

function mask(v: string): string {
  if (!v) return v
  if (v.length <= 6) return '••••'
  return v.slice(0, 3) + '••••••' + v.slice(-3)
}

// Default settings schema (categories + fields) used by the UI
export const SETTINGS_SCHEMA = {
  payment: {
    label: 'Payment Gateway',
    fields: [
      { key: 'payment_provider', label: 'Provider', type: 'select', options: ['Razorpay', 'Cashfree', 'PayU', 'PhonePe', 'Stripe', 'UPI Direct'], default: 'UPI Direct' },
      { key: 'payment_enabled', label: 'Enabled', type: 'toggle', default: 'true' },
      { key: 'payment_test_mode', label: 'Test / Sandbox mode', type: 'toggle', default: 'true' },
      { key: 'payment_merchant_id', label: 'Merchant ID / Key ID', type: 'text', default: '' },
      { key: 'payment_api_key', label: 'API Key', type: 'secret', default: '' },
      { key: 'payment_api_secret', label: 'API Secret', type: 'secret', default: '' },
      { key: 'payment_salt', label: 'Salt / Webhook Secret', type: 'secret', default: '' },
      { key: 'payment_webhook_url', label: 'Webhook URL', type: 'text', default: '' },
      { key: 'payment_success_url', label: 'Success redirect URL', type: 'text', default: '' },
      { key: 'payment_currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR', 'AED'], default: 'INR' },
    ],
  },
  email: {
    label: 'Email (SMTP)',
    fields: [
      { key: 'email_enabled', label: 'Enabled', type: 'toggle', default: 'true' },
      { key: 'email_provider', label: 'Provider', type: 'select', options: ['SMTP', 'SendGrid', 'Mailgun', 'Amazon SES', 'Postmark'], default: 'SMTP' },
      { key: 'email_smtp_host', label: 'SMTP Host', type: 'text', default: 'smtp.gmail.com' },
      { key: 'email_smtp_port', label: 'SMTP Port', type: 'text', default: '587' },
      { key: 'email_encryption', label: 'Encryption', type: 'select', options: ['TLS', 'SSL', 'None'], default: 'TLS' },
      { key: 'email_username', label: 'Username', type: 'text', default: '' },
      { key: 'email_password', label: 'Password / API Key', type: 'secret', default: '' },
      { key: 'email_from_address', label: 'From address', type: 'text', default: 'noreply@specialfare.com' },
      { key: 'email_from_name', label: 'From name', type: 'text', default: 'Special Fare' },
    ],
  },
  whatsapp: {
    label: 'WhatsApp Business',
    fields: [
      { key: 'whatsapp_enabled', label: 'Enabled', type: 'toggle', default: 'true' },
      { key: 'whatsapp_provider', label: 'Provider', type: 'select', options: ['WhatsApp Cloud API (Meta)', 'Twilio', 'Gupshup', 'Interakt'], default: 'WhatsApp Cloud API (Meta)' },
      { key: 'whatsapp_phone_number_id', label: 'Phone Number ID', type: 'text', default: '' },
      { key: 'whatsapp_business_id', label: 'WhatsApp Business Account ID', type: 'text', default: '' },
      { key: 'whatsapp_token', label: 'Access Token', type: 'secret', default: '' },
      { key: 'whatsapp_app_secret', label: 'App Secret', type: 'secret', default: '' },
      { key: 'whatsapp_sender_phone', label: 'Sender phone (E.164)', type: 'text', default: '' },
      { key: 'whatsapp_template_name', label: 'Default template name', type: 'text', default: 'booking_confirmation' },
      { key: 'whatsapp_webhook_url', label: 'Webhook URL', type: 'text', default: '' },
    ],
  },
} as const

// GET settings — admin only. Secrets masked.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const reveal = searchParams.get('reveal') === '1'

  const rows = await db.setting.findMany()
  const map: Record<string, { value: string; category: string; masked: boolean; updatedAt: string }> = {}
  for (const r of rows) {
    const isSecret = SECRET_KEYS.has(r.key)
    map[r.key] = {
      value: isSecret && !reveal ? mask(r.value) : r.value,
      category: r.category,
      masked: isSecret && !reveal,
      updatedAt: r.toISOString ? r.updatedAt.toISOString() : String(r.updatedAt),
    }
  }

  return NextResponse.json({ settings: map, schema: SETTINGS_SCHEMA })
}

// PUT settings — admin only. Bulk upsert.
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = (await req.json()) as { settings: Record<string, string> }
    if (!body.settings || typeof body.settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 })
    }

    // Determine category for each key from the schema
    const keyToCat: Record<string, string> = {}
    for (const [cat, def] of Object.entries(SETTINGS_SCHEMA)) {
      for (const f of def.fields) keyToCat[f.key] = cat
    }

    const ops = Object.entries(body.settings).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value: String(value), category: keyToCat[key] || 'general' },
        create: { key, value: String(value), category: keyToCat[key] || 'general' },
      }),
    )
    await db.$transaction(ops)

    // return masked view
    const rows = await db.setting.findMany()
    const map: Record<string, { value: string; category: string; masked: boolean; updatedAt: string }> = {}
    for (const r of rows) {
      const isSecret = SECRET_KEYS.has(r.key)
      map[r.key] = {
        value: isSecret ? mask(r.value) : r.value,
        category: r.category,
        masked: isSecret,
        updatedAt: r.toISOString ? r.updatedAt.toISOString() : String(r.updatedAt),
      }
    }
    return NextResponse.json({ ok: true, settings: map })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save settings' }, { status: 500 })
  }
}
