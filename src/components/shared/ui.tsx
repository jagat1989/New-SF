'use client'

import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = 'teal',
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  hint?: string
  accent?: 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
}) {
  const accents: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
  }
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground truncate">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn('rounded-xl p-2.5 shrink-0', accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    REFUNDED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    OPEN: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    SOLD_OUT: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    SUSPENDED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', map[status] || 'bg-slate-100 text-slate-700')}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
    </div>
  )
}
