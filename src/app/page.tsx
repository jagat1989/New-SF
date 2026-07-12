'use client'

import * as React from 'react'
import { useAuth } from '@/store/auth'
import { AuthScreen } from '@/components/auth-screen'
import { AppShell } from '@/components/app-shell'
import { Plane } from 'lucide-react'

export default function Home() {
  const { user, initialized, init } = useAuth()

  React.useEffect(() => {
    init()
  }, [init])

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-xl sky-gradient flex items-center justify-center animate-pulse">
          <Plane className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Special Fare…</p>
      </div>
    )
  }

  if (!user) return <AuthScreen />
  return <AppShell />
}
