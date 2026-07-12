'use client'

import * as React from 'react'
import { useState } from 'react'
import { Plane, Mail, Lock, User, Phone, Building2, ArrowRight, Sparkles, ShieldCheck, Users, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/store/auth'
import { toast } from 'sonner'
import type { Role } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'

const ROLE_OPTIONS: { value: Role; label: string; desc: string; icon: any }[] = [
  { value: 'CUSTOMER', label: 'Customer', desc: 'Book flights & pay via QR', icon: Users },
  { value: 'AGENT', label: 'Travel Agent', desc: 'B2B booking + commission', icon: Briefcase },
  { value: 'SUPPLIER', label: 'Supplier', desc: 'Manage inventory & departures', icon: Plane },
]

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@specialfare.com', color: 'bg-rose-500' },
  { role: 'Supplier', email: 'supplier@skywings.com', color: 'bg-amber-500' },
  { role: 'Agent', email: 'agent@flymart.com', color: 'bg-emerald-500' },
  { role: 'Customer', email: 'rahul@example.com', color: 'bg-sky-500' },
]

export function AuthScreen() {
  const { login, register, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', company: '', role: 'CUSTOMER' as Role,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back!')
      } else {
        await register(form)
        toast.success('Account created!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    }
  }

  const quickLogin = async (email: string) => {
    setForm((f) => ({ ...f, email, password: 'password123' }))
    try {
      await login(email, 'password123')
      toast.success('Logged in with demo account')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 glass sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl sky-gradient flex items-center justify-center shadow-md">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-foreground leading-none">Special Fare</p>
              <p className="text-[10px] text-muted-foreground">Flight Booking Platform</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2">
        {/* Left: hero */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 sky-gradient text-white overflow-hidden">
          <div className="absolute inset-0 plane-path opacity-40" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Pre-purchase inventory · Fixed departures extranet
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight max-w-md">
              The complete B2B & B2C flight booking platform
            </h1>
            <p className="mt-4 text-white/85 max-w-md leading-relaxed">
              Suppliers publish pre-purchase inventory and fixed departures. Agents book at net rates with commission. Customers search and pay instantly via QR scan.
            </p>
          </div>
          <div className="relative grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: Plane, t: 'Extranet', d: 'Fixed departures management' },
              { icon: ShieldCheck, t: 'QR Pay', d: 'Instant UPI scan payments' },
              { icon: Users, t: 'Multi-role', d: 'Admin · Supplier · Agent · Customer' },
              { icon: Briefcase, t: 'B2B rates', d: 'Agent commission tracking' },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-white/12 backdrop-blur p-4 border border-white/15">
                <f.icon className="h-5 w-5 mb-2" />
                <p className="font-semibold text-sm">{f.t}</p>
                <p className="text-xs text-white/80 mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="inline-flex rounded-lg bg-muted p-1 mb-6 lg:hidden">
                <button
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setMode('login')}
                >Login</button>
                <button
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                  onClick={() => setMode('register')}
                >Register</button>
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'login' ? 'Sign in to your Special Fare account' : 'Join Special Fare as a customer, agent or supplier'}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">I am a</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLE_OPTIONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                          className={`rounded-xl border p-3 text-left transition ${form.role === r.value ? 'border-primary bg-accent/50 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                        >
                          <r.icon className={`h-4 w-4 mb-1.5 ${form.role === r.value ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="text-xs font-semibold">{r.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={User} label="Full name">
                      <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="pl-9" />
                    </Field>
                    <Field icon={Phone} label="Phone">
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." className="pl-9" />
                    </Field>
                  </div>
                  {(form.role === 'AGENT' || form.role === 'SUPPLIER') && (
                    <Field icon={Building2} label="Company">
                      <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company / Agency name" className="pl-9" />
                    </Field>
                  )}
                </>
              )}
              <Field icon={Mail} label="Email">
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="pl-9" />
              </Field>
              <Field icon={Lock} label="Password">
                <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" className="pl-9" />
              </Field>
              <Button type="submit" disabled={loading} className="w-full h-11 sky-gradient text-white hover:opacity-90">
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 hidden lg:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{mode === 'login' ? 'New here?' : 'Already have an account?'}</span>
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-semibold text-primary hover:underline">
                {mode === 'login' ? 'Create account' : 'Sign in'}
              </button>
            </div>

            {/* Demo quick login */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-3">Quick demo login (password: password123)</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    onClick={() => quickLogin(a.email)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/50 hover:bg-accent/30 transition disabled:opacity-50"
                  >
                    <span className={`h-2 w-2 rounded-full ${a.color}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">{a.role}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © 2025 Special Fare · Pre-purchase flight inventory & QR payments
      </footer>
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {children}
      </div>
    </div>
  )
}
