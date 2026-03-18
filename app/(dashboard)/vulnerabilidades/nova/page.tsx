"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVulnStore } from "@/lib/vuln-store"
import { toast } from "sonner"
import type { Criticidade, Status, OwaspCategory, Complexidade } from "@/lib/types"

const criticidades: Criticidade[] = ['Extrema', 'Crítica', 'Alta', 'Média', 'Baixa', 'Informativa']
const squads = ['AppMais', 'Acessos', 'Atendimento Digital', 'Autorizadores', 'Canais Clientes', 'Canais Lojistas', 'Cloud', 'Conta do Mais', 'Crédito', 'Desacoplamento', 'Field', 'Invillia', 'Jurídico', 'OpenFinance e Pix', 'Onplug', 'Prevenção a Fraude', 'Portal Credsystem', 'Time de Arquitetura (Aceleradora)', 'Sem dono', 'SFCWeb', 'SOC', 'Sustentação']
const sistemas = ['App Pl', 'App Mais', 'Autorizadores', 'Cartão Mais Website', 'Cleo', 'Cyber', 'Credsystem Website', 'Credline Digital', 'Cloud', 'Impulse Up', 'Legal Manager', 'Odonto Website', 'Onplug', 'PontoTel', 'Portal do Cartão', 'Portal do Cartão Mobile', 'Portal Lojista', 'Privacidade Website', 'Portal SSO', 'RHSSO', 'Servidor', 'SFC Web', 'URA', 'Websystem', 'Workstation']
const ambientes = ['Produção', 'Homologação', 'Desenvolvimento']
const origens: ('Pentest' | 'DAST' | 'SAST' | 'SCA' | 'Bug Bounty' | 'Manual' | 'Monitoramento' | 'Code Review')[] = [
  'Pentest', 'DAST', 'SAST', 'SCA', 'Bug Bounty', 'Manual', 'Monitoramento', 'Code Review'
]
const statusOptions: Status[] = ['Nova', 'Aberta', 'Em Backlog', 'Em Correção', 'Em Reteste', 'Mitigada', 'Concluída', 'Risco Aceito', 'Fechada']
const tiposAtivo = ['Aplicação', 'Infraestrutura']
const metodosHttp = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
const owaspCategories: OwaspCategory[] = [
  'A01:2025-Broken Access Control',
  'A02:2025-Cryptographic Failures',
  'A03:2025-Injection',
  'A04:2025-Insecure Design',
  'A05:2025-Security Misconfiguration',
  'A06:2025-Vulnerable Components',
  'A07:2025-Authentication Failures',
  'A08:2025-Data Integrity Failures',
  'A09:2025-Logging Failures',
  'A10:2025-SSRF'
]
const responsaveis = ['João Silva', 'Ana Costa', 'Carlos Mendes', 'Lucas Ferreira', 'Maria Santos', 'Pedro Lima']
const complexidades: Complexidade[] = ['Baixa', 'Média', 'Alta']

export default function NovaVulnerabilidadePage() {
  const router = useRouter()
  const { addVulnerabilidade } = useVulnStore()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    titulo: '',
    descricaoExecutiva: '',
    descricaoTecnica: '',
    criticidade: '' as Criticidade | '',
    scoreCvss: '',
    vetorCvss: '',
    cwe: '',
    owaspCategory: '' as OwaspCategory | '',
    squad: '',
    responsavel: '',
    gestor: '',
    sistema: '',
    ativo: '',
    componente: '',
    ambiente: '',
    endpoint: '',
    metodoHttp: '',
    parametroAfetado: '',
    evidenciaTextual: '',
    origem: '' as 'Pentest' | 'DAST' | 'SAST' | 'SCA' | 'Bug Bounty' | 'Manual' | 'Monitoramento' | 'Code Review' | '',
    status: 'Nova' as Status | '',
    sla: '',
    tags: '',
    recomendacao: '',
    impacto: '',
    tipo: 'Aplicação',
    dataDeteccao: '',
    observacao: '',
    complexidade: 'Média' as Complexidade,
    complexidadeCorrecao: 'Média' as Complexidade,
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.titulo.trim()) newErrors.titulo = 'Título é obrigatório'
    if (!formData.descricaoExecutiva.trim()) newErrors.descricaoExecutiva = 'Descrição executiva é obrigatória'
    if (!formData.criticidade) newErrors.criticidade = 'Criticidade é obrigatória'
    if (!formData.squad) newErrors.squad = 'Squad é obrigatória'
    if (!formData.sistema) newErrors.sistema = 'Sistema é obrigatório'
    if (!formData.ativo.trim()) newErrors.ativo = 'Ativo é obrigatório'
    if (!formData.ambiente) newErrors.ambiente = 'Ambiente é obrigatório'
    if (!formData.origem) newErrors.origem = 'Origem é obrigatória'
    if (!formData.status) newErrors.status = 'Status é obrigatório'
    if (!formData.sla) newErrors.sla = 'SLA é obrigatório'
    if (!formData.dataDeteccao) newErrors.dataDeteccao = 'Data Detecção é obrigatória'

    if (formData.scoreCvss) {
      const score = parseFloat(formData.scoreCvss)
      if (isNaN(score) || score < 0 || score > 10) {
        newErrors.scoreCvss = 'Score CVSS deve ser entre 0 e 10'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('Formulário inválido', {
        description: 'Corrija os erros antes de continuar.'
      })
      return
    }

    setSaving(true)

    setTimeout(() => {
      addVulnerabilidade({
        titulo: formData.titulo,
        descricaoExecutiva: formData.descricaoExecutiva,
        descricaoTecnica: formData.descricaoTecnica || formData.descricaoExecutiva,
        criticidade: formData.criticidade as Criticidade,
        scoreCvss: formData.scoreCvss ? parseFloat(formData.scoreCvss) : 5.0,
        vetorCvss: formData.vetorCvss || undefined,
        cwe: formData.cwe || undefined,
        owaspCategory: formData.owaspCategory as OwaspCategory || undefined,
        squad: formData.squad,
        responsavel: formData.responsavel || undefined,
        gestor: formData.gestor || undefined,
        sistema: formData.sistema,
        ativo: formData.ativo,
        componente: formData.componente || undefined,
        ambiente: formData.ambiente,
        endpoint: formData.endpoint || undefined,
        metodoHttp: formData.metodoHttp || undefined,
        parametroAfetado: formData.parametroAfetado || undefined,
        evidenciaTextual: formData.evidenciaTextual || undefined,
        origem: formData.origem as 'Pentest' | 'DAST' | 'SAST' | 'SCA' | 'Bug Bounty' | 'Manual' | 'Monitoramento' | 'Code Review',
        sla: formData.sla,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        recomendacao: formData.recomendacao || undefined,
        impacto: formData.impacto || undefined,
        tipo: formData.tipo,
        dataDeteccao: formData.dataDeteccao || undefined,
        observacao: formData.observacao || undefined,
        reincidencia: 0,
        status: formData.status as Status,
        complexidade: formData.complexidade,
        complexidadeCorrecao: formData.complexidadeCorrecao,
      })

      setSaving(false)
      toast.success('Vulnerabilidade criada', {
        description: 'A vulnerabilidade foi cadastrada com sucesso.'
      })
      router.push('/vulnerabilidades')
    }, 1000)
  }

  const handleSaveDraft = () => {
    toast.info('Rascunho salvo', {
      description: 'Os dados foram salvos localmente.'
    })
  }

  const handleCancel = () => {
    router.push('/vulnerabilidades')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Back Link */}
      <Link
        href="/vulnerabilidades"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Vulnerabilidades
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Vulnerabilidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre uma nova vulnerabilidade no sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            Salvar Rascunho
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Criar Vulnerabilidade
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Informações Básicas */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Informações Básicas</CardTitle>
            <CardDescription>Dados principais da vulnerabilidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="Ex: SQL Injection no endpoint de login"
                value={formData.titulo}
                onChange={(e) => handleChange('titulo', e.target.value)}
                className={errors.titulo ? 'border-red-500' : ''}
              />
              {errors.titulo && <p className="mt-1 text-xs text-red-500">{errors.titulo}</p>}
            </div>

            <div>
              <Label htmlFor="descricaoExecutiva">Descrição Executiva *</Label>
              <Textarea
                id="descricaoExecutiva"
                placeholder="Descrição de alto nível para stakeholders não técnicos"
                value={formData.descricaoExecutiva}
                onChange={(e) => handleChange('descricaoExecutiva', e.target.value)}
                rows={3}
                className={errors.descricaoExecutiva ? 'border-red-500' : ''}
              />
              {errors.descricaoExecutiva && <p className="mt-1 text-xs text-red-500">{errors.descricaoExecutiva}</p>}
            </div>

            <div>
              <Label htmlFor="descricaoTecnica">Descrição Técnica</Label>
              <Textarea
                id="descricaoTecnica"
                placeholder="Detalhes técnicos da vulnerabilidade"
                value={formData.descricaoTecnica}
                onChange={(e) => handleChange('descricaoTecnica', e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="impacto">Impacto (Jira)</Label>
              <Textarea
                id="impacto"
                placeholder="Excesso de informações, XSS, etc..."
                value={formData.impacto}
                onChange={(e) => handleChange('impacto', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Criticidade *</Label>
                <Select value={formData.criticidade} onValueChange={(v) => handleChange('criticidade', v)}>
                  <SelectTrigger className={errors.criticidade ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {criticidades.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.criticidade && <p className="mt-1 text-xs text-red-500">{errors.criticidade}</p>}
              </div>

              <div>
                <Label>Status da Falha *</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
              </div>

              <div>
                <Label>Origem *</Label>
                <Select value={formData.origem} onValueChange={(v) => handleChange('origem', v)}>
                  <SelectTrigger className={errors.origem ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {origens.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.origem && <p className="mt-1 text-xs text-red-500">{errors.origem}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Complexidade da Falha</Label>
                <Select value={formData.complexidade} onValueChange={(v) => handleChange('complexidade', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {complexidades.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Complexidade de Correção</Label>
                <Select value={formData.complexidadeCorrecao} onValueChange={(v) => handleChange('complexidadeCorrecao', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {complexidades.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classificação Técnica */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Classificação Técnica</CardTitle>
            <CardDescription>CVSS, CWE e OWASP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="scoreCvss">Score CVSS (0-10)</Label>
                <Input
                  id="scoreCvss"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="Ex: 7.5"
                  value={formData.scoreCvss}
                  onChange={(e) => handleChange('scoreCvss', e.target.value)}
                  className={errors.scoreCvss ? 'border-red-500' : ''}
                />
                {errors.scoreCvss && <p className="mt-1 text-xs text-red-500">{errors.scoreCvss}</p>}
              </div>

              <div>
                <Label htmlFor="cwe">CWE</Label>
                <Input
                  id="cwe"
                  placeholder="Ex: CWE-89"
                  value={formData.cwe}
                  onChange={(e) => handleChange('cwe', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vetorCvss">Vetor CVSS</Label>
              <Input
                id="vetorCvss"
                placeholder="Ex: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
                value={formData.vetorCvss}
                onChange={(e) => handleChange('vetorCvss', e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label>OWASP 2025</Label>
              <Select value={formData.owaspCategory} onValueChange={(v) => handleChange('owaspCategory', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {owaspCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Responsabilidade */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Responsabilidade</CardTitle>
            <CardDescription>Squad e responsáveis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Squad *</Label>
              <Select value={formData.squad} onValueChange={(v) => handleChange('squad', v)}>
                <SelectTrigger className={errors.squad ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione a squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.squad && <p className="mt-1 text-xs text-red-500">{errors.squad}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Responsável</Label>
                <Select value={formData.responsavel} onValueChange={(v) => handleChange('responsavel', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gestor">Gestor</Label>
                <Input
                  id="gestor"
                  placeholder="Nome do gestor"
                  value={formData.gestor}
                  onChange={(e) => handleChange('gestor', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dataDeteccao">Data da Detecção *</Label>
                <Input
                  id="dataDeteccao"
                  type="date"
                  value={formData.dataDeteccao}
                  onChange={(e) => handleChange('dataDeteccao', e.target.value)}
                  className={errors.dataDeteccao ? 'border-red-500' : ''}
                />
                {errors.dataDeteccao && <p className="mt-1 text-xs text-red-500">{errors.dataDeteccao}</p>}
              </div>

              <div>
                <Label htmlFor="sla">SLA (Data limite) *</Label>
                <Input
                  id="sla"
                  type="date"
                  value={formData.sla}
                  onChange={(e) => handleChange('sla', e.target.value)}
                  className={errors.sla ? 'border-red-500' : ''}
                />
                {errors.sla && <p className="mt-1 text-xs text-red-500">{errors.sla}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Localização */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Localização</CardTitle>
            <CardDescription>Sistema, ativo e componentes afetados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAtivo.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sistema *</Label>
                <Select value={formData.sistema} onValueChange={(v) => handleChange('sistema', v)}>
                  <SelectTrigger className={errors.sistema ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {sistemas.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sistema && <p className="mt-1 text-xs text-red-500">{errors.sistema}</p>}
              </div>

              <div>
                <Label>Ambiente *</Label>
                <Select value={formData.ambiente} onValueChange={(v) => handleChange('ambiente', v)}>
                  <SelectTrigger className={errors.ambiente ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ambientes.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ambiente && <p className="mt-1 text-xs text-red-500">{errors.ambiente}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="ativo">Ativo *</Label>
              <Input
                id="ativo"
                placeholder="Ex: api-gateway, web-app"
                value={formData.ativo}
                onChange={(e) => handleChange('ativo', e.target.value)}
                className={errors.ativo ? 'border-red-500' : ''}
              />
              {errors.ativo && <p className="mt-1 text-xs text-red-500">{errors.ativo}</p>}
            </div>

            <div>
              <Label htmlFor="componente">Componente</Label>
              <Input
                id="componente"
                placeholder="Ex: AuthController, UserModule"
                value={formData.componente}
                onChange={(e) => handleChange('componente', e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="endpoint">Endpoint</Label>
                <Input
                  id="endpoint"
                  placeholder="Ex: /api/auth/login"
                  value={formData.endpoint}
                  onChange={(e) => handleChange('endpoint', e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label>Método HTTP</Label>
                <Select value={formData.metodoHttp} onValueChange={(v) => handleChange('metodoHttp', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosHttp.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="parametroAfetado">Parâmetro Afetado</Label>
              <Input
                id="parametroAfetado"
                placeholder="Ex: username, user_id"
                value={formData.parametroAfetado}
                onChange={(e) => handleChange('parametroAfetado', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Evidências e Recomendação */}
        <Card className="bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evidências e Recomendação</CardTitle>
            <CardDescription>Provas e orientações de correção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="evidenciaTextual">Evidência Textual</Label>
              <Textarea
                id="evidenciaTextual"
                placeholder="Descreva a prova de conceito ou evidência da vulnerabilidade"
                value={formData.evidenciaTextual}
                onChange={(e) => handleChange('evidenciaTextual', e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="recomendacao">Recomendação</Label>
              <Textarea
                id="recomendacao"
                placeholder="Orientações técnicas para correção da vulnerabilidade"
                value={formData.recomendacao}
                onChange={(e) => handleChange('recomendacao', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="injection, autenticação, crítico (separadas por vírgula)"
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="observacao">Observação Interna</Label>
              <Textarea
                id="observacao"
                placeholder="Anotações internas..."
                value={formData.observacao}
                onChange={(e) => handleChange('observacao', e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Upload Evidência
              </Button>
              <Button variant="outline" size="sm" disabled>
                Upload Screenshot
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
