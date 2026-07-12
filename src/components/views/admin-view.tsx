'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Users, Plane, CalendarDays, Ticket, TrendingUp, Wallet,
  Plus, Pencil, Trash2, Shield, Loader2, Search, UserCog, ArrowRight,
  DollarSign, Building2, Filter,
  CreditCard, Mail, MessageCircle, Settings as SettingsIcon,
  Save, PlugZap, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

import { api, formatINR, formatDate, formatDateTime } from '@/lib/api'
import type { Flight, FixedDeparture, Booking, Role } from '@/lib/types'
import { useAuth, ROLE_LABEL, ROLE_BADGE } from '@/store/auth'
import { StatCard, StatusBadge, SectionHeader, EmptyState } from '@/components/shared/ui'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ---------- helpers ----------
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#e11d48',    // rose-600
  SUPPLIER: '#d97706', // amber-600
  AGENT: '#059669',    // emerald-600
  CUSTOMER: '#0284c7', // sky-600
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function routeOf(f?: { origin: string; originCity: string; destination: string; destinationCity: string } | null) {
  if (!f) return '—'
  return `${f.origin} → ${f.destination}`
}
function routeCityOf(f?: { origin: string; originCity: string; destination: string; destinationCity: string } | null) {
  if (!f) return ''
  return `${f.originCity} → ${f.destinationCity}`
}

function initialsOf(name: string) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// ---------- types ----------
interface AdminUser {
  id: string
  email: string
  name: string
  role: Role
  phone: string | null
  company: string | null
  balance: number
  commissionRate: number
  active: boolean
  createdAt: string
}

interface AdminStats {
  users: number
  flights: number
  departures: number
  bookings: number
  revenue: number
  recentBookings: number
  byRole: { role: string; count: number }[]
  revenueTrend: { date: string; revenue: number }[]
}

// ============================================================
// Root
// ============================================================
export function AdminView({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  return (
    <div className="max-w-7xl mx-auto w-full">
      {active === 'overview' && <OverviewSection setActive={setActive} />}
      {active === 'users' && <UsersSection />}
      {active === 'flights' && <FlightsSection />}
      {active === 'departures' && <DeparturesSection />}
      {active === 'bookings' && <BookingsSection />}
      {active === 'settings' && <SettingsSection />}
    </div>
  )
}

// ============================================================
// Overview
// ============================================================
function OverviewSection({ setActive }: { setActive: (s: string) => void }) {
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [recent, setRecent] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([api.stats(), api.bookings.list()])
      .then(([s, b]) => {
        if (!alive) return
        setStats(s as AdminStats)
        setRecent((b.bookings || []).slice(0, 8))
      })
      .catch((e) => toast.error(e.message || 'Failed to load stats'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Platform Overview" description="Platform-wide metrics and recent activity" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  const roleData = (stats.byRole || []).map((r) => ({
    role: r.role,
    label: ROLE_LABEL[r.role as Role] || r.role,
    count: r.count,
    color: ROLE_COLORS[r.role] || '#64748b',
  }))

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform Overview"
        description="Platform-wide metrics and recent activity"
        action={<Badge variant="outline" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Admin</Badge>}
      />

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.users} icon={Users} accent="teal" hint="All roles" />
        <StatCard label="Total Flights" value={stats.flights} icon={Plane} accent="sky" hint="Catalog inventory" />
        <StatCard label="Fixed Departures" value={stats.departures} icon={CalendarDays} accent="violet" hint="Extranet listings" />
        <StatCard label="Total Bookings" value={stats.bookings} icon={Ticket} accent="emerald" hint="All time" />
        <StatCard label="Platform Revenue" value={formatINR(stats.revenue)} icon={DollarSign} accent="amber" hint="Paid payments" />
        <StatCard label="Bookings This Week" value={stats.recentBookings} icon={TrendingUp} accent="rose" hint="Last 7 days" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" /> Revenue (last 7 days)
            </CardTitle>
            <CardDescription className="text-xs">Daily paid payment totals</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.revenueTrend || []} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3, fill: '#0d9488' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-600" /> Users by Role
            </CardTitle>
            <CardDescription className="text-xs">Distribution across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              {roleData.length > 0 ? (
                <PieChart>
                  <Pie data={roleData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {roleData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No users yet</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4 text-teal-600" /> Recent Bookings
              </CardTitle>
              <CardDescription className="text-xs">Latest 8 bookings on the platform</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive('bookings')}>
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <EmptyState icon={Ticket} title="No bookings yet" description="Bookings will appear here once customers start booking." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead className="hidden md:table-cell">Route</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Booked by</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-semibold">{b.reference}</TableCell>
                      <TableCell className="font-medium">{b.passengerName}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{b.flight?.flightNumber}</span>
                        <span className="block text-[10px] text-muted-foreground">{b.flight?.airline}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{routeOf(b.flight)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(b.totalAmount)}</TableCell>
                      <TableCell><StatusBadge status={b.paymentStatus} /></TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[b.bookedByRole as Role] || '')}>{b.bookedByRole}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Users
// ============================================================
function UsersSection() {
  const { user: me } = useAuth()
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL')

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(null)
  const [busy, setBusy] = React.useState(false)

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const { users } = await api.users.list()
      setUsers(users as AdminUser[])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  async function toggleActive(u: AdminUser, next: boolean) {
    try {
      await api.users.update(u.id, { active: next })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, active: next } : x))
      toast.success(`${u.name} ${next ? 'activated' : 'suspended'}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await api.users.remove(deleteTarget.id)
      toast.success(`${deleteTarget.name} removed`)
      setDeleteTarget(null)
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="User Management"
        description="Create and manage all platform users"
        action={
          <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-1.5" /> Add User
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="ADMIN">Administrator</SelectItem>
            <SelectItem value="SUPPLIER">Supplier</SelectItem>
            <SelectItem value="AGENT">Travel Agent</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Try adjusting filters or add a new user." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Commission</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isSelf = me?.id === u.id
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-[180px]">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="sky-gradient text-white text-[10px] font-bold">{initialsOf(u.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate flex items-center gap-1.5">
                                {u.name}
                                {isSelf && <span className="text-[9px] bg-muted px-1 rounded text-muted-foreground">YOU</span>}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[u.role])}>
                            {ROLE_LABEL[u.role]}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{u.company || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{u.phone || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatINR(u.balance)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell text-xs">{u.commissionRate}%</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={u.active}
                            disabled={isSelf}
                            onCheckedChange={(v) => toggleActive(u, v)}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              disabled={isSelf}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onDone={fetchUsers} />
      <EditUserDialog target={editTarget} onClose={() => setEditTarget(null)} onDone={fetchUsers} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}). Their related bookings and inventory may be affected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CreateUserDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [form, setForm] = React.useState({
    name: '', email: '', password: 'password123', role: 'CUSTOMER' as Role,
    phone: '', company: '', commissionRate: '0', balance: '0', active: true,
  })
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) setForm({
      name: '', email: '', password: 'password123', role: 'CUSTOMER',
      phone: '', company: '', commissionRate: '0', balance: '0', active: true,
    })
  }, [open])

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    setBusy(true)
    try {
      await api.users.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password || 'password123',
        role: form.role,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        commissionRate: Number(form.commissionRate) || 0,
        balance: Number(form.balance) || 0,
        active: form.active,
      })
      toast.success(`${ROLE_LABEL[form.role]} created`)
      onOpenChange(false)
      onDone()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="h-4 w-4 text-teal-600" /> Add New User</DialogTitle>
          <DialogDescription>Create a new account with a specific role. Default password is <code className="text-xs bg-muted px-1 rounded">password123</code>.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@specialfare.com" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="AGENT">Travel Agent</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="password123" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="SkyWings Airlines" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Commission rate (%)</Label>
              <Input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Opening balance (₹)</Label>
              <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Suspended users cannot sign in</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />} Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ target, onClose, onDone }: { target: AdminUser | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = React.useState({
    name: '', role: 'CUSTOMER' as Role, phone: '', company: '',
    commissionRate: '0', balance: '0', active: true,
  })
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (target) {
      setForm({
        name: target.name,
        role: target.role,
        phone: target.phone || '',
        company: target.company || '',
        commissionRate: String(target.commissionRate ?? 0),
        balance: String(target.balance ?? 0),
        active: target.active,
      })
    }
  }, [target])

  async function submit() {
    if (!target) return
    setBusy(true)
    try {
      await api.users.update(target.id, {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        commissionRate: Number(form.commissionRate) || 0,
        balance: Number(form.balance) || 0,
        active: form.active,
      })
      toast.success(`${target.name} updated`)
      onClose()
      onDone()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update user')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-teal-600" /> Edit User</DialogTitle>
          <DialogDescription>Update <strong>{target?.name}</strong>'s profile and account settings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="AGENT">Travel Agent</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Commission rate (%)</Label>
              <Input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Balance (₹)</Label>
              <Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Suspended users cannot sign in</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Pencil className="h-4 w-4 mr-1.5" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Flights (oversight - delete only)
// ============================================================
function FlightsSection() {
  const [flights, setFlights] = React.useState<Flight[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [deleteTarget, setDeleteTarget] = React.useState<Flight | null>(null)
  const [busy, setBusy] = React.useState(false)

  const fetch = React.useCallback(async () => {
    setLoading(true)
    try {
      const { flights } = await api.flights.list()
      setFlights(flights)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load flights')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetch() }, [fetch])

  const filtered = flights.filter((f) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      f.flightNumber.toLowerCase().includes(q) ||
      f.airline.toLowerCase().includes(q) ||
      `${f.origin}-${f.destination}`.toLowerCase().includes(q) ||
      `${f.originCity} ${f.destinationCity}`.toLowerCase().includes(q) ||
      (f.supplier?.company || '').toLowerCase().includes(q)
    )
  })

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await api.flights.remove(deleteTarget.id)
      toast.success(`Flight ${deleteTarget.flightNumber} removed`)
      setDeleteTarget(null)
      fetch()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete flight')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="All Flights" description="Platform-wide flight inventory (read-only oversight)" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flight number, airline, route, supplier…" className="pl-9 max-w-md" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Plane} title="No flights found" description="Adjust your search or wait for suppliers to add inventory." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead className="hidden md:table-cell">Supplier</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="hidden lg:table-cell">Schedule</TableHead>
                    <TableHead className="hidden md:table-cell">Duration</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Seats</TableHead>
                    <TableHead className="text-right">Base price</TableHead>
                    <TableHead className="hidden md:table-cell">Cabin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <span className="font-semibold">{f.flightNumber}</span>
                        <span className="block text-[10px] text-muted-foreground">{f.airline}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {f.supplier?.company || f.supplier?.name || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{routeOf(f)}</div>
                        <div className="text-[10px] text-muted-foreground">{routeCityOf(f)}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {f.departureTime} → {f.arrivalTime}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{formatDuration(f.durationMins)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-xs">{f.totalSeats}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(f.basePrice)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px]">{f.cabinClass}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={f.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget(f)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flight?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.flightNumber}</strong> ({deleteTarget?.airline}) and all its fixed departures. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600">
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />} Delete flight
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Departures (read-only oversight)
// ============================================================
function DeparturesSection() {
  const [departures, setDepartures] = React.useState<FixedDeparture[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('ALL')

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    api.departures.list()
      .then(({ departures }) => alive && setDepartures(departures))
      .catch((e) => toast.error(e.message || 'Failed to load departures'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const filtered = departures.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      d.flight.flightNumber.toLowerCase().includes(q) ||
      d.flight.airline.toLowerCase().includes(q) ||
      `${d.flight.origin}-${d.flight.destination}`.toLowerCase().includes(q) ||
      (d.supplier?.company || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      <SectionHeader title="Fixed Departures" description="All extranet departures across suppliers (read-only)" />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flight, airline, route, supplier…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="SOLD_OUT">Sold out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No departures found" description="Adjust filters or wait for suppliers to publish departures." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead className="hidden md:table-cell">Supplier</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Seats (booked/total)</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Cost</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">Markup</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => {
                    const pct = d.availableSeats > 0 ? Math.round((d.bookedSeats / d.availableSeats) * 100) : 100
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <span className="font-semibold">{d.flight.flightNumber}</span>
                          <span className="block text-[10px] text-muted-foreground">{d.flight.airline}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {d.supplier?.company || d.supplier?.name || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{routeOf(d.flight)}</div>
                          <div className="text-[10px] text-muted-foreground">{routeCityOf(d.flight)}</div>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(d.departureDate)}</TableCell>
                        <TableCell className="min-w-[140px]">
                          <div className="text-xs font-medium mb-1">{d.bookedSeats}/{d.availableSeats}</div>
                          <Progress value={pct} className="h-1.5" />
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-xs">{formatINR(d.costPrice)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatINR(d.sellingPrice)}</TableCell>
                        <TableCell className="text-right hidden lg:table-cell text-xs text-emerald-600 font-medium">
                          {d.markup > 0 ? `+${formatINR(d.markup)}` : '—'}
                        </TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Bookings (all)
// ============================================================
function BookingsSection() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [payFilter, setPayFilter] = React.useState('ALL')
  const [roleFilter, setRoleFilter] = React.useState('ALL')

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    api.bookings.list()
      .then(({ bookings }) => alive && setBookings(bookings))
      .catch((e) => toast.error(e.message || 'Failed to load bookings'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const filtered = bookings.filter((b) => {
    if (payFilter !== 'ALL' && b.paymentStatus !== payFilter) return false
    if (roleFilter !== 'ALL' && b.bookedByRole !== roleFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return b.reference.toLowerCase().includes(q) || b.passengerName.toLowerCase().includes(q)
  })

  const totalRevenue = bookings.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + b.totalAmount, 0)
  const pendingAmount = bookings.filter((b) => b.paymentStatus === 'PENDING').reduce((s, b) => s + b.totalAmount, 0)
  const totalCommission = bookings.filter((b) => b.paymentStatus === 'PAID').reduce((s, b) => s + b.commission, 0)

  return (
    <div className="space-y-5">
      <SectionHeader title="All Bookings" description="Every booking across the platform" />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{formatINR(totalRevenue)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Paid bookings</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Amount</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{formatINR(pendingAmount)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Awaiting payment</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950 p-2.5">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commission Paid</p>
              <p className="mt-1 text-2xl font-bold text-teal-600">{formatINR(totalCommission)}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">To agents</p>
            </div>
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950 p-2.5">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reference or passenger…" className="pl-9" />
        </div>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-[170px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All payments</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[170px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All bookers</SelectItem>
            <SelectItem value="CUSTOMER">By customers</SelectItem>
            <SelectItem value="AGENT">By agents</SelectItem>
            <SelectItem value="ADMIN">By admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Ticket} title="No bookings found" description="Adjust your filters to see more results." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead className="hidden md:table-cell">Route</TableHead>
                    <TableHead className="hidden lg:table-cell">Departure</TableHead>
                    <TableHead className="text-right">Seats</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Commission</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="hidden md:table-cell">Booked by</TableHead>
                    <TableHead className="hidden xl:table-cell">Booker</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-semibold">{b.reference}</TableCell>
                      <TableCell>
                        <p className="font-medium">{b.passengerName}</p>
                        <p className="text-[10px] text-muted-foreground">{b.passengerEmail}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{b.flight?.flightNumber}</span>
                        <span className="block text-[10px] text-muted-foreground">{b.flight?.airline}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{routeOf(b.flight)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {b.fixedDeparture ? formatDate(b.fixedDeparture.departureDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{b.seats}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(b.totalAmount)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-xs text-teal-600 font-medium">
                        {b.commission > 0 ? formatINR(b.commission) : '—'}
                      </TableCell>
                      <TableCell><StatusBadge status={b.paymentStatus} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[b.bookedByRole as Role] || '')}>
                          {b.bookedByRole}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs">{b.user?.name || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(b.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Settings — Payment Gateway / Email / WhatsApp configuration
// ============================================================

type FieldType = 'text' | 'secret' | 'toggle' | 'select'

interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: readonly string[]
  default: string
  placeholder?: string
  hint?: string
}

interface CategoryDef {
  label: string
  icon: any
  accent: string
  description: string
  fields: FieldDef[]
}

const PAYMENT_FIELDS: FieldDef[] = [
  { key: 'payment_provider', label: 'Payment provider', type: 'select', options: ['UPI Direct', 'Razorpay', 'Cashfree', 'PayU', 'PhonePe', 'Stripe'], default: 'UPI Direct' },
  { key: 'payment_enabled', label: 'Enable online payments', type: 'toggle', default: 'true' },
  { key: 'payment_test_mode', label: 'Test / sandbox mode', type: 'toggle', default: 'true', hint: 'Use sandbox credentials without charging real cards' },
  { key: 'payment_merchant_id', label: 'Merchant ID / Key ID', type: 'text', default: '', placeholder: 'MERCHANT_ID' },
  { key: 'payment_api_key', label: 'API Key', type: 'secret', default: '', placeholder: 'pk_live_•••• or key id' },
  { key: 'payment_api_secret', label: 'API Secret', type: 'secret', default: '', placeholder: '••••••••••••' },
  { key: 'payment_salt', label: 'Salt / Webhook Secret', type: 'secret', default: '', placeholder: 'Used to verify webhook signatures' },
  { key: 'payment_webhook_url', label: 'Webhook URL', type: 'text', default: '', placeholder: 'https://your-domain.com/api/webhooks/payment' },
  { key: 'payment_success_url', label: 'Success redirect URL', type: 'text', default: '', placeholder: '/bookings?status=success' },
  { key: 'payment_currency', label: 'Settlement currency', type: 'select', options: ['INR', 'USD', 'EUR', 'AED'], default: 'INR' },
]

const EMAIL_FIELDS: FieldDef[] = [
  { key: 'email_enabled', label: 'Enable email notifications', type: 'toggle', default: 'true' },
  { key: 'email_provider', label: 'Provider', type: 'select', options: ['SMTP', 'SendGrid', 'Mailgun', 'Amazon SES', 'Postmark'], default: 'SMTP' },
  { key: 'email_smtp_host', label: 'SMTP host', type: 'text', default: 'smtp.gmail.com', placeholder: 'smtp.example.com' },
  { key: 'email_smtp_port', label: 'SMTP port', type: 'text', default: '587', placeholder: '587 / 465 / 25' },
  { key: 'email_encryption', label: 'Encryption', type: 'select', options: ['TLS', 'SSL', 'None'], default: 'TLS' },
  { key: 'email_username', label: 'Username', type: 'text', default: '', placeholder: 'apikey or email address' },
  { key: 'email_password', label: 'Password / API key', type: 'secret', default: '', placeholder: '••••••••••••' },
  { key: 'email_from_address', label: 'From address', type: 'text', default: 'noreply@specialfare.com' },
  { key: 'email_from_name', label: 'From name', type: 'text', default: 'Special Fare' },
]

const WHATSAPP_FIELDS: FieldDef[] = [
  { key: 'whatsapp_enabled', label: 'Enable WhatsApp notifications', type: 'toggle', default: 'true' },
  { key: 'whatsapp_provider', label: 'Provider', type: 'select', options: ['WhatsApp Cloud API (Meta)', 'Twilio', 'Gupshup', 'Interakt'], default: 'WhatsApp Cloud API (Meta)' },
  { key: 'whatsapp_phone_number_id', label: 'Phone Number ID', type: 'text', default: '', placeholder: 'Meta phone number ID' },
  { key: 'whatsapp_business_id', label: 'WhatsApp Business Account ID', type: 'text', default: '', placeholder: 'WABA ID' },
  { key: 'whatsapp_token', label: 'Access token', type: 'secret', default: '', placeholder: 'Permanent or system-user token' },
  { key: 'whatsapp_app_secret', label: 'App secret', type: 'secret', default: '', placeholder: 'For webhook verification' },
  { key: 'whatsapp_sender_phone', label: 'Sender phone (E.164)', type: 'text', default: '', placeholder: '+919876543210' },
  { key: 'whatsapp_template_name', label: 'Default template name', type: 'text', default: 'booking_confirmation' },
  { key: 'whatsapp_webhook_url', label: 'Webhook URL', type: 'text', default: '', placeholder: 'https://your-domain.com/api/webhooks/whatsapp' },
]

const CATEGORIES: CategoryDef[] = [
  { label: 'Payment Gateway', icon: CreditCard, accent: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300', description: 'Configure your payment processor, API keys and webhooks for online ticket purchases.', fields: PAYMENT_FIELDS },
  { label: 'Email (SMTP)', icon: Mail, accent: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300', description: 'SMTP or transactional provider used for booking confirmations and e-tickets.', fields: EMAIL_FIELDS },
  { label: 'WhatsApp Business', icon: MessageCircle, accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300', description: 'Send booking updates and boarding reminders via WhatsApp Business API.', fields: WHATSAPP_FIELDS },
]

function SettingsSection() {
  const [tab, setTab] = React.useState('payment')
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [maskedKeys, setMaskedKeys] = React.useState<Set<string>>(new Set())
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState<string | null>(null)
  const [testTarget, setTestTarget] = React.useState<Record<string, string>>({ email: '', whatsapp: '' })
  const [lastSaved, setLastSaved] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { settings } = await api.settings.get()
      const v: Record<string, string> = {}
      const masked = new Set<string>()
      for (const cat of CATEGORIES) {
        for (const f of cat.fields) {
          if (settings[f.key]) {
            v[f.key] = settings[f.key].value
            if (settings[f.key].masked) masked.add(f.key)
          } else {
            v[f.key] = f.default
          }
        }
      }
      setValues(v)
      setMaskedKeys(masked)
      const latest = Object.values(settings).map((s: any) => s.updatedAt).sort().reverse()[0]
      if (latest) setLastSaved(latest)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const setField = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }))
    // editing a masked secret clears the mask flag so we save the real value
    setMaskedKeys((m) => { const n = new Set(m); n.delete(key); return n })
  }

  const save = async () => {
    setSaving(true)
    try {
      // Only send keys that are not still-masked (so we don't overwrite secrets with masked dots)
      const toSave: Record<string, string> = {}
      for (const cat of CATEGORIES) {
        for (const f of cat.fields) {
          if (maskedKeys.has(f.key) && values[f.key]?.includes('••••')) continue
          toSave[f.key] = values[f.key] ?? ''
        }
      }
      const res = await api.settings.update(toSave)
      // refresh masked state
      const masked = new Set<string>()
      for (const cat of CATEGORIES) for (const f of cat.fields) if (res.settings[f.key]?.masked) masked.add(f.key)
      setMaskedKeys(masked)
      const latest = Object.values(res.settings).map((s: any) => s.updatedAt).sort().reverse()[0]
      if (latest) setLastSaved(latest)
      toast.success('Settings saved successfully')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const test = async (channel: 'payment' | 'email' | 'whatsapp') => {
    setTesting(channel)
    try {
      const target = channel === 'email' ? testTarget.email : channel === 'whatsapp' ? testTarget.whatsapp : undefined
      const res = await api.settings.test(channel, target)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    } catch (e: any) {
      toast.error(e.message || 'Test failed')
    } finally {
      setTesting(null)
    }
  }

  const activeCat = CATEGORIES.find((c) => c.label.toLowerCase().startsWith(tab)) || CATEGORIES[0]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Platform Settings"
        description="Configure payment gateway, email and WhatsApp used across the booking platform."
        action={
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Last saved {formatDateTime(lastSaved)}
              </span>
            )}
            <Button onClick={save} disabled={saving} className="sky-gradient text-white">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-3 h-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.label} value={c.label.split(' ')[0].toLowerCase()} className="flex items-center gap-2 py-2">
              <c.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{c.label.split(' ')[0]}</span>
              <span className="sm:hidden">{c.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const tabVal = cat.label.split(' ')[0].toLowerCase()
          const channel = tabVal === 'payment' ? 'payment' : tabVal === 'email' ? 'email' : 'whatsapp'
          return (
            <TabsContent key={cat.label} value={tabVal} className="mt-4">
              <Card className="border-border/60 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-xl p-2.5 shrink-0', cat.accent)}>
                        <cat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cat.label}</CardTitle>
                        <CardDescription className="mt-1 max-w-xl">{cat.description}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => test(channel as any)}
                      disabled={testing === channel}
                    >
                      {testing === channel ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Testing…</>
                      ) : (
                        <><PlugZap className="h-3.5 w-3.5 mr-1.5" /> Test connection</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* optional test target for email/whatsapp */}
                  {channel !== 'payment' && (
                    <div className="flex items-end gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          {channel === 'email' ? 'Send test email to (optional)' : 'Send test message to (optional, E.164)'}
                        </Label>
                        <Input
                          value={testTarget[channel] || ''}
                          onChange={(e) => setTestTarget((t) => ({ ...t, [channel]: e.target.value }))}
                          placeholder={channel === 'email' ? 'admin@specialfare.com' : '+919876543210'}
                          className="h-9 bg-background"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                    {cat.fields.map((f) => (
                      <SettingField
                        key={f.key}
                        field={f}
                        value={values[f.key] ?? f.default}
                        masked={maskedKeys.has(f.key)}
                        revealed={!!revealed[f.key]}
                        onChange={(val) => setField(f.key, val)}
                        onToggleReveal={() => setRevealed((r) => ({ ...r, [f.key]: !r[f.key] }))}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* security note */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-4">
        <KeyRound className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-0.5">Credential security</p>
          API keys, secrets and passwords are stored in the platform database and masked in the admin UI.
          Only administrators can view or modify these settings. Use the <span className="font-medium">reveal</span> eye icon
          to inspect a saved secret, and always run a <span className="font-medium">Test connection</span> after changing credentials.
        </div>
      </div>
    </div>
  )
}

function SettingField({
  field, value, masked, revealed, onChange, onToggleReveal,
}: {
  field: FieldDef
  value: string
  masked: boolean
  revealed: boolean
  onChange: (v: string) => void
  onToggleReveal: () => void
}) {
  const isSecret = field.type === 'secret'
  const showMaskedDots = masked && isSecret && !revealed
  const displayValue = showMaskedDots && value.includes('••••') ? value : value

  return (
    <div className={cn('space-y-1.5', field.type === 'toggle' && 'flex items-center justify-between gap-3 pt-1')}>
      <div className={cn(field.type === 'toggle' && 'flex-1')}>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {field.label}
          {isSecret && <KeyRound className="h-3 w-3 text-amber-500" />}
        </Label>
        {field.hint && <p className="text-[10px] text-muted-foreground/80 leading-tight">{field.hint}</p>}
      </div>

      {field.type === 'toggle' ? (
        <Switch checked={value === 'true'} onCheckedChange={(c) => onChange(c ? 'true' : 'false')} />
      ) : field.type === 'select' ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          <Input
            type={isSecret && !revealed ? 'password' : 'text'}
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn('h-9', isSecret && 'pr-9 font-mono text-xs')}
          />
          {isSecret && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
