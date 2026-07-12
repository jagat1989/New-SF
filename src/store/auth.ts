'use client'

import { create } from 'zustand'
import type { SessionUser, Role } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (d: { name: string; email: string; password: string; role: string; phone?: string; company?: string }) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  init: async () => {
    try {
      const { user } = await api.auth.me()
      set({ user, initialized: true })
    } catch {
      set({ user: null, initialized: true })
    }
  },
  login: async (email, password) => {
    set({ loading: true })
    try {
      const { user } = await api.auth.login(email, password)
      set({ user, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },
  register: async (d) => {
    set({ loading: true })
    try {
      const { user } = await api.auth.register(d)
      set({ user, loading: false })
    } catch (e) {
      set({ loading: false })
      throw e
    }
  },
  logout: async () => {
    await api.auth.logout()
    set({ user: null })
  },
  refresh: async () => {
    try {
      const { user } = await api.auth.me()
      set({ user })
    } catch {}
  },
}))

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  SUPPLIER: 'Supplier',
  AGENT: 'Travel Agent',
  CUSTOMER: 'Customer',
}

export const ROLE_BADGE: Record<Role, string> = {
  ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  SUPPLIER: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  AGENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  CUSTOMER: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
}
