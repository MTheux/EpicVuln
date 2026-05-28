import { create } from 'zustand'
import type { Asset, AssetType, BusinessCriticality, AssetStatus } from './types'
import { authHeaders } from './auth'

interface AssetStats {
  total: number
  critical: number
  withOpenVulns: number
  avgRiskScore: number
}

interface AssetState {
  assets: Asset[]
  isLoading: boolean
  error: string | null
  stats: AssetStats
  fetchAssets: () => Promise<void>
  fetchStats: () => Promise<void>
  createAsset: (data: Partial<Asset>) => Promise<void>
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  getById: (id: string) => Asset | undefined
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:9001`
  }
  return 'http://localhost:9001'
}

const ASSET_API = () => `${getApiUrl()}/api/assets`

// Fetch seguro: intercepta 401 (token expirado) e redireciona pro login
let isRedirecting = false
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const mergedInit: RequestInit = {
    ...init,
    credentials: 'include',
  }
  const response = await fetch(input, mergedInit)
  if (response.status === 401 && !isRedirecting) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      isRedirecting = true
      document.cookie = 'epicvuln_session=; path=/; max-age=0'
      document.cookie = 'epicvuln_token=; path=/; max-age=0'
      localStorage.removeItem('epicvuln_user')
      window.location.href = '/login'
    }
    throw new Error('SESSION_EXPIRED')
  }
  return response
}

const reverseAssetType: Record<string, AssetType> = {
  'API': 'API',
  'WEB_APP': 'Web App',
  'INFRA': 'Infra',
  'DATABASE': 'Database',
  'CLOUD_SERVICE': 'Cloud Service',
  'OUTRO': 'Outro',
}

const reverseBusinessCriticality: Record<string, BusinessCriticality> = {
  'CRITICAL': 'Critical',
  'HIGH': 'High',
  'MEDIUM': 'Medium',
  'LOW': 'Low',
}

const reverseAssetStatus: Record<string, AssetStatus> = {
  'ACTIVE': 'Active',
  'INACTIVE': 'Inactive',
  'DECOMMISSIONED': 'Decommissioned',
}

const forwardAssetType: Record<string, string> = {
  'API': 'API',
  'Web App': 'WEB_APP',
  'Infra': 'INFRA',
  'Database': 'DATABASE',
  'Cloud Service': 'CLOUD_SERVICE',
  'Outro': 'OUTRO',
}

const forwardBusinessCriticality: Record<string, string> = {
  'Critical': 'CRITICAL',
  'High': 'HIGH',
  'Medium': 'MEDIUM',
  'Low': 'LOW',
}

const forwardAssetStatus: Record<string, string> = {
  'Active': 'ACTIVE',
  'Inactive': 'INACTIVE',
  'Decommissioned': 'DECOMMISSIONED',
}

const forwardEnvironment: Record<string, string> = {
  'Produção': 'PRODUCAO',
  'Homologação': 'HOMOLOGACAO',
  'Desenvolvimento': 'DESENVOLVIMENTO',
  'Staging': 'STAGING',
}

const reverseEnvironment: Record<string, string> = {
  'PRODUCAO': 'Produção',
  'HOMOLOGACAO': 'Homologação',
  'DESENVOLVIMENTO': 'Desenvolvimento',
  'STAGING': 'Staging',
}

const mapAssetFromBackend = (item: any): Asset => ({
  id: item.id,
  name: item.name,
  type: reverseAssetType[item.type] || item.type,
  description: item.description,
  businessCriticality: reverseBusinessCriticality[item.businessCriticality] || item.businessCriticality,
  owner: item.owner,
  squad: item.squad,
  environment: reverseEnvironment[item.environment] || item.environment,
  url: item.url,
  tags: item.tags || [],
  status: reverseAssetStatus[item.status] || item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  vulnerabilityCount: item.vulnerabilityCount ?? item._count?.vulnerabilities ?? 0,
  openVulnCount: item.openVulnCount ?? 0,
  criticalVulnCount: item.criticalVulnCount ?? 0,
  riskScore: item.riskScore ?? 0,
})

const mapAssetToBackend = (data: Partial<Asset>): any => {
  const mapped: any = { ...data }
  if (data.type) mapped.type = forwardAssetType[data.type] || data.type
  if (data.businessCriticality) mapped.businessCriticality = forwardBusinessCriticality[data.businessCriticality] || data.businessCriticality
  if (data.status) mapped.status = forwardAssetStatus[data.status] || data.status
  if (data.environment) mapped.environment = forwardEnvironment[data.environment] || data.environment
  return mapped
}

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  isLoading: false,
  error: null,
  stats: { total: 0, critical: 0, withOpenVulns: 0, avgRiskScore: 0 },

  fetchAssets: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeFetch(ASSET_API(), { headers: authHeaders() })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha ao buscar ativos do servidor' }))
        throw new Error(errorData.error || 'Falha ao buscar ativos do servidor')
      }
      const data = await response.json()
      const items = Array.isArray(data) ? data : (data.data || [])
      const mappedData: Asset[] = items.map(mapAssetFromBackend)

      // Compute stats locally
      const total = mappedData.length
      const critical = mappedData.filter(a => a.businessCriticality === 'Critical').length
      const withOpenVulns = mappedData.filter(a => (a.openVulnCount || 0) > 0).length
      const avgRiskScore = total > 0
        ? Math.round(mappedData.reduce((sum, a) => sum + (a.riskScore || 0), 0) / total)
        : 0

      set({
        assets: mappedData,
        stats: { total, critical, withOpenVulns, avgRiskScore },
        isLoading: false,
      })
    } catch (err: any) {
      console.error(err)
      set({ error: err.message, isLoading: false })
    }
  },

  fetchStats: async () => {
    try {
      const response = await safeFetch(`${ASSET_API()}/stats`, { headers: authHeaders() })
      if (!response.ok) return
      const data = await response.json()
      set({
        stats: {
          total: data.total ?? 0,
          critical: data.critical ?? 0,
          withOpenVulns: data.withOpenVulns ?? 0,
          avgRiskScore: data.avgRiskScore ?? 0,
        },
      })
    } catch (err: any) {
      console.error(err)
    }
  },

  createAsset: async (data) => {
    try {
      const response = await safeFetch(ASSET_API(), {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(mapAssetToBackend(data)),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar ativo' }))
        throw new Error(errorData.error || 'Erro ao criar ativo')
      }
      await get().fetchAssets()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  updateAsset: async (id, data) => {
    try {
      const response = await safeFetch(`${ASSET_API()}/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(mapAssetToBackend(data)),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar ativo' }))
        throw new Error(errorData.error || 'Erro ao atualizar ativo')
      }
      await get().fetchAssets()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  deleteAsset: async (id) => {
    try {
      const response = await safeFetch(`${ASSET_API()}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao deletar ativo' }))
        throw new Error(errorData.error || 'Erro ao deletar ativo')
      }
      await get().fetchAssets()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  getById: (id) => {
    return get().assets.find((a) => a.id === id)
  },
}))
