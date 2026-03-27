"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

interface Preferences {
  autoContrast: boolean
  compactMode: boolean
  alertSounds: boolean
}

interface PreferencesContextType {
  preferences: Preferences
  setPreference: (key: keyof Preferences, value: boolean) => void
}

const defaults: Preferences = {
  autoContrast: true,
  compactMode: false,
  alertSounds: false,
}

const PreferencesContext = createContext<PreferencesContextType>({
  preferences: defaults,
  setPreference: () => {},
})

export function usePreferences() {
  return useContext(PreferencesContext)
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("epicvuln_preferences")
      if (saved) {
        setPreferences({ ...defaults, ...JSON.parse(saved) })
      }
    } catch {}
    setMounted(true)
  }, [])

  // Apply CSS classes to <html> whenever preferences change
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement

    if (preferences.compactMode) {
      root.classList.add("compact")
    } else {
      root.classList.remove("compact")
    }

    if (preferences.autoContrast) {
      root.classList.add("high-contrast")
    } else {
      root.classList.remove("high-contrast")
    }
  }, [preferences, mounted])

  const setPreference = useCallback((key: keyof Preferences, value: boolean) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem("epicvuln_preferences", JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  return (
    <PreferencesContext.Provider value={{ preferences, setPreference }}>
      {children}
    </PreferencesContext.Provider>
  )
}
