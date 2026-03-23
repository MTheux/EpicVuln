"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getUser } from "@/lib/auth"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const user = getUser()
      if (!user) {
        router.replace('/login')
        setChecked(true)
        return
      }
      setIsAuth(true)

      // Check onboarding status (skip if already on onboarding page)
      if (pathname !== '/onboarding') {
        try {
          const res = await fetch(`${getApiUrl()}/api/settings/onboarding-status`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (!data.completed) {
              router.replace('/onboarding')
              setOnboardingDone(false)
              setChecked(true)
              return
            }
          }
        } catch {
          // If check fails, allow access (don't block on network error)
        }
      }
      setOnboardingDone(true)
      setChecked(true)
    }
    checkAuth()
  }, [pathname, router])

  if (!checked || !isAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
