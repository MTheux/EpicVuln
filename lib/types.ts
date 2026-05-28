// EpicVuln - Types

export type Criticidade = 'Crítica' | 'Alta' | 'Média' | 'Baixa' | 'Informativa'

export type Status =
  | 'Nova'
  | 'Aberta'
  | 'Em Backlog'
  | 'Em Correção'
  | 'Em Reteste'
  | 'Mitigada'
  | 'Concluída'
  | 'Risco Aceito'
  | 'Fechada'

export type Complexidade = 'Baixa' | 'Média' | 'Alta'

export type OwaspCategory =
  | 'A01:2025-Broken Access Control'
  | 'A02:2025-Cryptographic Failures'
  | 'A03:2025-Injection'
  | 'A04:2025-Insecure Design'
  | 'A05:2025-Security Misconfiguration'
  | 'A06:2025-Vulnerable Components'
  | 'A07:2025-Authentication Failures'
  | 'A08:2025-Data Integrity Failures'
  | 'A09:2025-Logging Failures'
  | 'A10:2025-SSRF'

export interface Vulnerabilidade {
  id: string
  codigoInterno?: string
  rtcWorkItemId?: string
  titulo: string
  descricaoExecutiva: string
  descricaoTecnica: string
  criticidade: Criticidade
  scoreCvss: number
  vetorCvss?: string
  cwe?: string
  owaspCategory?: OwaspCategory
  squad: string
  responsavel?: string
  gestor?: string
  sistema: string
  ativo: string
  componente?: string
  ambiente: string
  endpoint?: string
  metodoHttp?: string
  parametroAfetado?: string
  evidenciaTextual?: string
  evidenciaAnexo?: string
  screenshot?: string
  origem: 'Pentest' | 'DAST' | 'SAST' | 'SCA' | 'Bug Bounty' | 'Manual' | 'Monitoramento' | 'Code Review'
  dataCriacao: string
  ultimaAtualizacao: string
  sla: string
  diasEmAberto: number
  recomendacao?: string
  tags?: string[]
  reincidencia: number
  complexidade: Complexidade
  complexidadeCorrecao: Complexidade
  historico?: HistoricoItem[]
  impacto?: string
  observacao?: string
  attachments?: {
    id: string
    filename: string
    originalName: string
    mimeType: string
    path: string
    size: number
    createdAt: string
  }[]
  tipo?: string
  dataDeteccao?: string
  notificacoesEnviadas: number
  status: Status
  assetId?: string | null
  asset?: { id: string; name: string; type: string } | null
  comentarios?: ComentarioItem[]
}

export interface ComentarioItem {
  id: string
  autor: string
  texto: string
  data: string
}

export interface HistoricoItem {
  data: string
  tipo: 'criacao' | 'status' | 'criticidade' | 'responsavel' | 'sincronizacao' | 'notificacao' | 'comentario' | 'sync_rtc'
  descricao: string
  description?: string
  createdAt?: string
  usuario?: string
  user?: { name: string }
}

export interface Squad {
  nome: string
  vulnerabilidades: number
  criticas: number
  vencidas: number
}

export interface Notificacao {
  id: string
  tipo: 'critica' | 'vencida' | 'sla' | 'resumo'
  titulo: string
  descricao: string
  dataEnvio: string
  squad: string
  vulnerabilidadeId?: string
}

export interface RegraNotificacao {
  id: string
  nome: string
  condicao: string
  ativa: boolean
  canal: 'email' | 'slack' | 'teams'
}

export interface IntegracaoRtc {
  status: 'conectado' | 'desconectado' | 'erro'
  urlInstancia?: string
  projetosMonitorados: string[]
  ultimaSincronizacao?: string
  workItemsImportados: number
}

export type AssetType = 'API' | 'Web App' | 'Infra' | 'Database' | 'Cloud Service' | 'Outro'
export type BusinessCriticality = 'Critical' | 'High' | 'Medium' | 'Low'
export type AssetStatus = 'Active' | 'Inactive' | 'Decommissioned'

export interface Asset {
  id: string
  name: string
  type: AssetType
  description?: string
  businessCriticality: BusinessCriticality
  owner?: string
  squad?: string
  environment: string
  url?: string
  tags: string[]
  status: AssetStatus
  createdAt: string
  updatedAt: string
  vulnerabilityCount?: number
  openVulnCount?: number
  criticalVulnCount?: number
  riskScore?: number
}
