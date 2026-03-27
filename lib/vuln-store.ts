import { create } from 'zustand'
import type { Vulnerabilidade, Status } from './types'
import { authHeaders } from './auth'

interface VulnState {
  vulnerabilidades: Vulnerabilidade[]
  isLoading: boolean
  error: string | null
  fetchVulnerabilidades: () => Promise<void>
  addVulnerabilidade: (vuln: Omit<Vulnerabilidade, 'id' | 'dataCriacao' | 'ultimaAtualizacao' | 'diasEmAberto' | 'historico' | 'notificacoesEnviadas'>) => Promise<void>
  updateStatus: (id: string, status: Status) => Promise<void>
  updateResponsavel: (id: string, responsavel: string) => Promise<void>
  getById: (id: string) => Vulnerabilidade | undefined
  sendNotification: (id: string) => Promise<void>
  deleteVulnerabilidade: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  syncRtc: () => Promise<void>
  uploadEvidence: (id: string, file: File) => Promise<any>
  importData: (jsonData: any[]) => Promise<{ imported: number, errors: any[] }>
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:9001`
  }
  return 'http://localhost:9001'
}

const VULN_API = () => `${getApiUrl()}/api/vulnerabilities`
const RTC_API = () => `${getApiUrl()}/api/rtc`

// Fetch seguro: intercepta 401 (token expirado) e redireciona pro login
// Always includes credentials so HttpOnly cookie is sent
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

export const useVulnStore = create<VulnState>((set, get) => ({
  vulnerabilidades: [],
  isLoading: false,
  error: null,

  fetchVulnerabilidades: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await safeFetch(VULN_API(), { headers: authHeaders() })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha ao buscar vulnerabilidades do servidor' }))
        throw new Error(errorData.error || 'Falha ao buscar vulnerabilidades do servidor')
      }
      const data = await response.json()

      const reverseCriticidade: any = { 'CRITICA': 'Crítica', 'ALTA': 'Alta', 'MEDIA': 'Média', 'BAIXA': 'Baixa', 'INFORMATIVA': 'Informativa' };
      const reverseStatus: any = { 'NOVO': 'Nova', 'ABERTO': 'Aberta', 'EM_BACKLOG': 'Em Backlog', 'EM_CORRECAO': 'Em Correção', 'EM_RETESTE': 'Em Reteste', 'MITIGADO': 'Mitigada', 'CONCLUIDO': 'Concluída', 'RISCO_ACEITO': 'Risco Aceito', 'FECHADO': 'Fechada' };
      const reverseOrigem: any = { 'PENTEST': 'Pentest', 'DAST': 'DAST', 'SAST': 'SAST', 'SCA': 'SCA', 'BUG_BOUNTY': 'Bug Bounty', 'MANUAL': 'Manual', 'MONITORAMENTO': 'Monitoramento', 'CODE_REVIEW': 'Code Review' };
      const reverseAmbiente: any = { 'PRODUCAO': 'Produção', 'HOMOLOGACAO': 'Homologação', 'DESENVOLVIMENTO': 'Desenvolvimento', 'STAGING': 'STG' };
      const reverseComplexidade: any = { 'BAIXA': 'Baixa', 'MEDIA': 'Média', 'ALTA': 'Alta' };

      const mappedData: Vulnerabilidade[] = data.map((item: any) => ({
        ...item,
        criticidade: reverseCriticidade[item.criticidade] || item.criticidade,
        status: reverseStatus[item.status] || item.status,
        origem: reverseOrigem[item.origem] || item.origem,
        ambiente: reverseAmbiente[item.ambiente] || item.ambiente,
        complexidade: reverseComplexidade[item.complexidade] || item.complexidade || 'Media',
        complexidadeCorrecao: reverseComplexidade[item.complexidadeCorrecao] || item.complexidadeCorrecao || 'Media',
        id: item.codigoInterno,
        dbId: item.id,
        dataCriacao: new Date(item.dataCriacao).toISOString().split('T')[0],
        ultimaAtualizacao: new Date(item.ultimaAtualizacao).toISOString().split('T')[0],
        sla: item.sla ? new Date(item.sla).toISOString().split('T')[0] : '',
        diasEmAberto: item.diasEmAberto || 0,
        notificacoesEnviadas: 0,
      }))

      set({ vulnerabilidades: mappedData, isLoading: false })
    } catch (err: any) {
      console.error(err)
      set({ error: err.message, isLoading: false })
    }
  },

  addVulnerabilidade: async (vuln) => {
    try {
      const response = await safeFetch(VULN_API(), {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify(vuln)
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao criar vulnerabilidade' }))
        throw new Error(errorData.error || 'Erro ao criar vulnerabilidade')
      }

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  updateStatus: async (id, status) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) throw new Error('Vulnerabilidade nao encontrada no local')

      const dbId = (vuln as any).dbId

      const response = await safeFetch(`${VULN_API()}/${dbId}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        body: JSON.stringify({ status })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar status' }))
        throw new Error(errorData.error || 'Erro ao atualizar status')
      }

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  updateResponsavel: async (id, responsavel) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) return

      const dbId = (vuln as any).dbId

      const response = await safeFetch(`${VULN_API()}/${dbId}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        body: JSON.stringify({ responsavel })
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao atualizar responsavel' }))
        throw new Error(errorData.error || 'Erro ao atualizar responsavel')
      }

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  getById: (id) => {
    return get().vulnerabilidades.find((v) => v.id === id)
  },

  sendNotification: async (id) => {
    console.log(`Notificacao simulada para ${id}`)
  },

  deleteVulnerabilidade: async (id) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) return

      const dbId = (vuln as any).dbId

      const response = await safeFetch(`${VULN_API()}/${dbId}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro ao deletar vulnerabilidade' }))
        throw new Error(errorData.error || 'Erro ao deletar vulnerabilidade')
      }

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  syncRtc: async () => {
    try {
      const response = await safeFetch(`${RTC_API()}/sync`, {
        method: 'POST',
        headers: { ...authHeaders() }
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha ao sincronizar com IBM RTC' }))
        throw new Error(errorData.error || 'Falha ao sincronizar com IBM RTC')
      }
      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  importData: async (jsonData: any[]) => {
    try {
      const response = await safeFetch(`${VULN_API()}/import`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify(jsonData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Falha na importacao de dados' }))
        throw new Error(errorData.error || 'Falha na importacao de dados')
      }

      const result = await response.json()
      await get().fetchVulnerabilidades()
      return result
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  clearAll: async () => {
    try {
      const response = await safeFetch(`${VULN_API()}/all`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Erro ao limpar base de dados')

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  uploadEvidence: async (id: string, file: File) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) throw new Error('Vulnerabilidade nao encontrada')

      const dbId = (vuln as any).dbId
      const formData = new FormData()
      formData.append('file', file)

      // Don't set Content-Type for multipart form - browser sets it automatically
      // credentials: 'include' is handled by safeFetch
      const response = await safeFetch(`${VULN_API()}/${dbId}/evidence`, {
        method: 'POST',
        body: formData
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'Erro ao fazer upload da evidencia')
      }

      const result = await response.json()
      await get().fetchVulnerabilidades()
      return result
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }
}))
