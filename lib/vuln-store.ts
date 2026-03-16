import { create } from 'zustand'
import type { Vulnerabilidade, Status } from './types'
import { authHeaders, getAuthToken } from './auth'

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
  syncJira: () => Promise<void>
  uploadEvidence: (id: string, file: File) => Promise<any>
  importData: (jsonData: any[]) => Promise<{ imported: number, errors: any[] }>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
const API_URL = `${BASE_URL}/api/vulnerabilities`

export const useVulnStore = create<VulnState>((set, get) => ({
  vulnerabilidades: [],
  isLoading: false,
  error: null,

  fetchVulnerabilidades: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(API_URL, { headers: authHeaders() })
      if (!response.ok) throw new Error('Falha ao buscar vulnerabilidades do servidor')
      const data = await response.json()

      const reverseCriticidade: any = { 'EXTREMA': 'Extrema', 'CRITICA': 'Crítica', 'ALTA': 'Alta', 'MEDIA': 'Média', 'BAIXA': 'Baixa', 'INFORMATIVA': 'Informativa' };
      const reverseStatus: any = { 'NOVO': 'Nova', 'ABERTO': 'Aberta', 'EM_BACKLOG': 'Em Backlog', 'EM_CORRECAO': 'Em Correção', 'EM_RETESTE': 'Em Reteste', 'MITIGADO': 'Mitigada', 'CONCLUIDO': 'Concluída', 'RISCO_ACEITO': 'Risco Aceito', 'FECHADO': 'Fechada' };
      const reverseOrigem: any = { 'PENTEST': 'Pentest', 'DAST': 'DAST', 'SAST': 'SAST', 'SCA': 'SCA', 'BUG_BOUNTY': 'Bug Bounty', 'MANUAL': 'Manual', 'MONITORAMENTO': 'Monitoramento', 'CODE_REVIEW': 'Code Review' };
      const reverseAmbiente: any = { 'PRODUCAO': 'Produção', 'HOMOLOGACAO': 'Homologação', 'DESENVOLVIMENTO': 'Desenvolvimento', 'STAGING': 'STG' };

      const mappedData: Vulnerabilidade[] = data.map((item: any) => ({
        ...item,
        criticidade: reverseCriticidade[item.criticidade] || item.criticidade,
        status: reverseStatus[item.status] || item.status,
        origem: reverseOrigem[item.origem] || item.origem,
        ambiente: reverseAmbiente[item.ambiente] || item.ambiente,
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify(vuln)
      })
      if (!response.ok) throw new Error('Erro ao criar vulnerabilidade')

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  updateStatus: async (id, status) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) throw new Error('Vulnerabilidade não encontrada no local')

      const dbId = (vuln as any).dbId

      const response = await fetch(`${API_URL}/${dbId}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Erro ao atualizar status')

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

      const response = await fetch(`${API_URL}/${dbId}`, {
        method: 'PATCH',
        headers: { ...authHeaders() },
        body: JSON.stringify({ responsavel })
      })
      if (!response.ok) throw new Error('Erro ao atualizar responsável')

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
    console.log(`Notificação simulada para ${id}`)
  },

  deleteVulnerabilidade: async (id) => {
    try {
      const vuln = get().vulnerabilidades.find(v => v.id === id)
      if (!vuln) return

      const dbId = (vuln as any).dbId

      const response = await fetch(`${API_URL}/${dbId}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!response.ok) throw new Error('Erro ao deletar vulnerabilidade')

      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  syncJira: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/jira/sync`, {
        method: 'POST',
        headers: { ...authHeaders() }
      })
      if (!response.ok) throw new Error('Falha ao sincronizar com Jira')
      await get().fetchVulnerabilidades()
    } catch (err: any) {
      console.error(err)
      throw err
    }
  },

  importData: async (jsonData: any[]) => {
    try {
      const response = await fetch(`${API_URL}/import`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify(jsonData)
      })
      if (!response.ok) throw new Error('Falha na importação de dados do Jira')
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
      const response = await fetch(`${API_URL}/all`, {
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
      if (!vuln) throw new Error('Vulnerabilidade não encontrada')

      const dbId = (vuln as any).dbId
      const formData = new FormData()
      formData.append('file', file)

      const token = getAuthToken()
      const response = await fetch(`${API_URL}/${dbId}/evidence`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData // o navegador seta o content-type para multipart form automatico
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error || 'Erro ao fazer upload da evidência')
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
