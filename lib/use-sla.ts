"use client"
import { useState, useEffect } from 'react'
import { authHeaders } from '@/lib/auth'

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

const DEFAULT_SLA: Record<string, number> = {
  EXTREMA: 0, CRITICA: 30, ALTA: 90, MEDIA: 180, BAIXA: 270, INFORMATIVA: 365
}

// Map display names to enum keys
const DISPLAY_TO_KEY: Record<string, string> = {
  'Extrema': 'EXTREMA', 'Crítica': 'CRITICA', 'Critica': 'CRITICA',
  'Alta': 'ALTA', 'Média': 'MEDIA', 'Media': 'MEDIA',
  'Baixa': 'BAIXA', 'Informativa': 'INFORMATIVA',
  'EXTREMA': 'EXTREMA', 'CRITICA': 'CRITICA', 'ALTA': 'ALTA',
  'MEDIA': 'MEDIA', 'BAIXA': 'BAIXA', 'INFORMATIVA': 'INFORMATIVA',
}

export function useSlaConfig() {
  const [slaConfig, setSlaConfig] = useState<Record<string, number>>(DEFAULT_SLA)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${getApiUrl()}/api/settings/sla`, { headers: authHeaders(), credentials: 'include' as RequestCredentials })
      .then(r => r.ok ? r.json() : DEFAULT_SLA)
      .then(data => setSlaConfig(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getSlaForSeverity = (criticidade: string): number => {
    const key = DISPLAY_TO_KEY[criticidade] || criticidade.toUpperCase()
    return slaConfig[key] ?? 90
  }

  const saveSlaConfig = async (config: Record<string, number>) => {
    const resp = await fetch(`${getApiUrl()}/api/settings/sla`, {
      method: 'PUT',
      headers: { ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(config),
    })
    if (!resp.ok) throw new Error('Erro ao salvar SLA')
    const data = await resp.json()
    setSlaConfig(data)
    return data
  }

  return { slaConfig, loading, getSlaForSeverity, saveSlaConfig }
}
