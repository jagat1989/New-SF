'use client'

import * as React from 'react'
import { Plane, LogOut, Wallet, Menu, X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth, ROLE_LABEL, ROLE_BADGE } from '@/store/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { formatINR } from '@/lib/api'
import type { Role } from '@/lib/types'
import { CustomerView } from '@/components/views/customer-view'
import { AgentView } from '@/components/views/agent-view'
import { SupplierView } from '@/components/views/supplier-view'
import { AdminView } from '@/components/views/admin-view'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: any
}

const NAV: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { id: 'search', label: 'Search Flights', icon: Plane },
    { id: 'bookings', label: 'My Bookings', icon: TicketIcon },
    { id: 'payments', label: 'Payments', icon: Wallet },
  ],
  AGENT: [
    { id: 'inventory', label: 'Pre-Purchase Inventory', icon: Plane },
    { id: 'bookings', label: 'My Bookings', icon: TicketIcon },
    { id: 'commission', label: 'Commission', icon: Wallet },
  ],
  SUPPLIER: [
    { id: 'overview', label: 'Dashboard', icon: LayoutIcon },
    { id: 'flights', label: 'My Flights', icon: Plane },
    { id: 'departures', label: 'Fixed Departures', icon: CalendarIcon },
    { id: 'bookings', label: 'Bookings', icon: TicketIcon },
  ],
  ADMIN: [
    { id: 'overview', label: 'Dashboard', icon: LayoutIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'flights', label: 'All Flights', icon: Plane },
    { id: 'departures', label: 'Fixed Departures', icon: CalendarIcon },
    { id: 'bookings', label: 'Bookings', icon: TicketIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ],
}

function TicketIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  )
}
function LayoutIcon(props: any) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg> }
function CalendarIcon(props: any) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg> }
function UsersIcon(props: any) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
function SettingsIcon(props: any) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg> }

export function AppShell() {
  const { user, logout } = useAuth()
  const [active, setActive] = React.useState('search')
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    const role = user!.role
    setActive(NAV[role][0].id)
  }, [user!.role])

  if (!user) return null
  const role = user.role
  const nav = NAV[role]

  const initials = user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-xl sky-gradient flex items-center justify-center shadow-md">
          <Plane className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sidebar-foreground leading-none">Special Fare</p>
          <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[role]} Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => { setActive(item.id); setMobileOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition group',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent/50 p-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="sky-gradient text-white text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between rounded-md bg-background/60 px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">Wallet</span>
            <span className="text-xs font-bold text-foreground">{formatINR(user.balance)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg sky-gradient flex items-center justify-center">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Special Fare</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[role])}>{ROLE_LABEL[role]}</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-sidebar sticky top-0 h-screen">
          {SidebarContent}
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10">
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </SheetContent>
        </Sheet>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Desktop top bar */}
          <header className="hidden lg:flex sticky top-0 z-20 h-16 border-b border-border bg-background/95 backdrop-blur items-center justify-between px-6">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <p className="font-semibold text-foreground -mt-0.5">{user.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', ROLE_BADGE[role])}>{ROLE_LABEL[role]}</span>
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Balance</span>
                <span className="text-sm font-bold text-foreground">{formatINR(user.balance)}</span>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto animate-fade-in">
            {role === 'CUSTOMER' && <CustomerView active={active} setActive={setActive} />}
            {role === 'AGENT' && <AgentView active={active} setActive={setActive} />}
            {role === 'SUPPLIER' && <SupplierView active={active} setActive={setActive} />}
            {role === 'ADMIN' && <AdminView active={active} setActive={setActive} />}
          </div>

          <footer className="mt-auto border-t border-border/60 py-5 px-6 text-center text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>© 2025 Special Fare</span>
              <span className="hidden sm:inline">·</span>
              <span>Pre-purchase inventory · Fixed departures extranet · QR scan payments</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
