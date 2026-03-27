"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  ExternalLink,
  Cloud,
  Server,
  GitBranch,
  Upload,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authHeaders } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}

const SECTORS = [
  "Financeiro",
  "Varejo",
  "Tecnologia",
  "Saude",
  "Educacao",
  "Governo",
  "Telecomunicacoes",
  "Outro",
]

interface DataSourceConfig {
  enabled: boolean
  url?: string
  email?: string
  token?: string
  projects?: string
  pat?: string
  project?: string
  username?: string
  password?: string
  projectId?: string
}

interface Squad {
  name: string
  leader: string
  techLead: string
  appsec: string
}

const DATA_SOURCES = [
  { id: "ibm-rtc", name: "IBM RTC", icon: Server, implemented: true },
  { id: "azure", name: "Azure DevOps", icon: Cloud, implemented: false },
  { id: "gitlab", name: "GitLab Issues", icon: GitBranch, implemented: false },
  { id: "csv", name: "Manual/CSV", icon: Upload, implemented: true },
]

const STEPS = [
  { number: 1, title: "Empresa" },
  { number: 2, title: "Data Sources" },
  { number: 3, title: "Squads" },
  { number: 4, title: "Revisao" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const API_URL = getApiUrl()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Step 1 - Company
  const [companyName, setCompanyName] = useState("")
  const [sector, setSector] = useState("")
  const [description, setDescription] = useState("")

  // Step 2 - Data Sources
  const [dataSources, setDataSources] = useState<Record<string, DataSourceConfig>>({
    "ibm-rtc": { enabled: false },
    azure: { enabled: false },
    gitlab: { enabled: false },
    csv: { enabled: true },
  })

  // Step 3 - Squads
  const [squads, setSquads] = useState<Squad[]>([
    { name: "", leader: "", techLead: "", appsec: "" },
  ])

  // Load existing profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/settings/company-profile`, {
          headers: authHeaders(),
          credentials: 'include',
        })
        if (resp.ok) {
          const profile = await resp.json()
          if (profile.name) {
            setCompanyName(profile.name || "")
            setSector(profile.sector || "")
            setDescription(profile.description || "")
            if (profile.dataSources) setDataSources(profile.dataSources)
            if (profile.squads?.length) setSquads(profile.squads)
          }
        }
      } catch {}

      // Try to pre-populate squads from vulnerabilities
      try {
        const resp = await fetch(`${API_URL}/api/vulnerabilities`, {
          headers: authHeaders(),
          credentials: 'include',
        })
        if (resp.ok) {
          const data = await resp.json()
          const vulns = Array.isArray(data) ? data : data.vulnerabilities || []
          const uniqueSquads = [...new Set(vulns.map((v: any) => v.squad).filter(Boolean))] as string[]
          if (uniqueSquads.length > 0) {
            setSquads(prev => {
              const existingNames = prev.filter(s => s.name).map(s => s.name)
              const newSquads = uniqueSquads
                .filter(name => !existingNames.includes(name))
                .map(name => ({ name, leader: "", techLead: "", appsec: "" }))
              const nonEmpty = prev.filter(s => s.name)
              return [...nonEmpty, ...newSquads].length > 0
                ? [...nonEmpty, ...newSquads]
                : [{ name: "", leader: "", techLead: "", appsec: "" }]
            })
          }
        }
      } catch {}

      setLoading(false)
    }
    loadProfile()
  }, [])

  const toggleDataSource = (id: string) => {
    if (id === "csv") return // CSV always on
    setDataSources(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }))
  }

  const updateDataSource = (id: string, field: string, value: string) => {
    setDataSources(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const addSquad = () => {
    setSquads(prev => [...prev, { name: "", leader: "", techLead: "", appsec: "" }])
  }

  const removeSquad = (index: number) => {
    setSquads(prev => prev.filter((_, i) => i !== index))
  }

  const updateSquad = (index: number, field: keyof Squad, value: string) => {
    setSquads(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const canProceed = () => {
    if (currentStep === 1) return companyName.trim().length > 0
    return true
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Save company profile
      const profileData = {
        name: companyName,
        sector,
        description,
        logo: "",
        dataSources,
        squads: squads.filter(s => s.name),
        assetCategories: [],
      }

      const resp = await fetch(`${API_URL}/api/settings/company-profile`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(profileData),
      })

      if (!resp.ok) throw new Error('Erro ao salvar perfil')

      // If IBM RTC is configured, save RTC settings separately
      if (dataSources["ibm-rtc"]?.enabled && dataSources["ibm-rtc"].url) {
        await fetch(`${API_URL}/api/rtc/settings`, {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            url: dataSources["ibm-rtc"].url,
            username: dataSources["ibm-rtc"].email,
            password: dataSources["ibm-rtc"].token,
            projectArea: dataSources["ibm-rtc"].projects,
          }),
        })
      }

      toast.success("Setup concluido!", {
        description: "O perfil da empresa foi configurado com sucesso.",
      })
      router.push("/")
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/10">
            <Building2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Setup Inicial</h1>
            <p className="text-sm text-muted-foreground">Configure o EpicVuln para sua empresa</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    currentStep > step.number
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : currentStep === step.number
                        ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                        : "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1.5 font-medium",
                    currentStep >= step.number ? "text-foreground" : "text-muted-foreground/50"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-12 sm:w-20 mx-2 mt-[-1.25rem] transition-all",
                    currentStep > step.number ? "bg-emerald-500" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Informacoes basicas sobre sua empresa. A descricao sera usada como contexto para a IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da empresa *</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Ex: Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector">Setor</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descricao do negocio</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva brevemente o que sua empresa faz, quais servicos oferece e quais sao os principais riscos de negocio..."
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Esta descricao sera usada como contexto para analises de IA sobre vulnerabilidades.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Fontes de Dados</CardTitle>
            <CardDescription>
              Selecione e configure as fontes de onde o EpicVuln importara vulnerabilidades.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DATA_SOURCES.map(source => {
              const config = dataSources[source.id]
              const isEnabled = source.id === "csv" || config?.enabled
              return (
                <div key={source.id}>
                  <div
                    onClick={() => toggleDataSource(source.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                      isEnabled
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isEnabled ? "bg-emerald-500/10" : "bg-muted"
                      )}>
                        <source.icon className={cn("h-5 w-5", isEnabled ? "text-emerald-500" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{source.name}</span>
                          {!source.implemented && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Integracao em breve
                            </Badge>
                          )}
                          {source.id === "csv" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/30 text-green-500">
                              Sempre disponivel
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isEnabled ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    )}>
                      {isEnabled && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>

                  {/* Config fields */}
                  {isEnabled && source.id === "ibm-rtc" && (
                    <div className="mt-3 ml-4 p-4 rounded-lg border border-dashed space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">URL do IBM RTC</Label>
                          <Input
                            placeholder="https://rtc.company.com/ccm"
                            value={config?.url || ""}
                            onChange={e => updateDataSource("ibm-rtc", "url", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Username</Label>
                          <Input
                            placeholder="user@company.com"
                            value={config?.email || ""}
                            onChange={e => updateDataSource("ibm-rtc", "email", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Password</Label>
                          <Input
                            type="password"
                            placeholder="Senha de acesso"
                            value={config?.token || ""}
                            onChange={e => updateDataSource("ibm-rtc", "token", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Project Area</Label>
                          <Input
                            placeholder="ProjectArea1"
                            value={config?.projects || ""}
                            onChange={e => updateDataSource("ibm-rtc", "projects", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isEnabled && source.id === "azure" && (
                    <div className="mt-3 ml-4 p-4 rounded-lg border border-dashed space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">URL do Azure DevOps</Label>
                          <Input
                            placeholder="https://dev.azure.com/org"
                            value={config?.url || ""}
                            onChange={e => updateDataSource("azure", "url", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">PAT Token</Label>
                          <Input
                            type="password"
                            placeholder="Personal Access Token"
                            value={config?.pat || ""}
                            onChange={e => updateDataSource("azure", "pat", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Projeto</Label>
                        <Input
                          placeholder="Nome do projeto"
                          value={config?.project || ""}
                          onChange={e => updateDataSource("azure", "project", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {isEnabled && source.id === "ibm-rtc" && (
                    <div className="mt-3 ml-4 p-4 rounded-lg border border-dashed space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">URL do RTC</Label>
                        <Input
                          placeholder="https://rtc.company.com"
                          value={config?.url || ""}
                          onChange={e => updateDataSource("ibm-rtc", "url", e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Username</Label>
                          <Input
                            placeholder="Usuário"
                            value={config?.username || ""}
                            onChange={e => updateDataSource("ibm-rtc", "username", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Senha</Label>
                          <Input
                            type="password"
                            placeholder="Senha"
                            value={config?.password || ""}
                            onChange={e => updateDataSource("ibm-rtc", "password", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isEnabled && source.id === "gitlab" && (
                    <div className="mt-3 ml-4 p-4 rounded-lg border border-dashed space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">URL do GitLab</Label>
                          <Input
                            placeholder="https://gitlab.com"
                            value={config?.url || ""}
                            onChange={e => updateDataSource("gitlab", "url", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Token</Label>
                          <Input
                            type="password"
                            placeholder="Access Token"
                            value={config?.token || ""}
                            onChange={e => updateDataSource("gitlab", "token", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Project ID</Label>
                        <Input
                          placeholder="12345"
                          value={config?.projectId || ""}
                          onChange={e => updateDataSource("gitlab", "projectId", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Squads</CardTitle>
            <CardDescription>
              Cadastre as squads da sua organizacao e seus responsaveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
                <span>Nome da Squad</span>
                <span>Lider/PO</span>
                <span>Tech Lead</span>
                <span>AppSec Responsavel</span>
                <span />
              </div>

              {squads.map((squad, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_40px] gap-3 items-center">
                  <Input
                    placeholder="Ex: Squad Pagamentos"
                    value={squad.name}
                    onChange={e => updateSquad(index, "name", e.target.value)}
                  />
                  <Input
                    placeholder="Nome do lider"
                    value={squad.leader}
                    onChange={e => updateSquad(index, "leader", e.target.value)}
                  />
                  <Input
                    placeholder="Tech Lead"
                    value={squad.techLead}
                    onChange={e => updateSquad(index, "techLead", e.target.value)}
                  />
                  <Input
                    placeholder="AppSec"
                    value={squad.appsec}
                    onChange={e => updateSquad(index, "appsec", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSquad(index)}
                    disabled={squads.length <= 1}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addSquad}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Squad
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisao & Conclusao</CardTitle>
            <CardDescription>
              Revise as informacoes antes de concluir o setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company summary */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Empresa
              </h3>
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {companyName}</p>
                {sector && <p className="text-sm"><span className="text-muted-foreground">Setor:</span> {sector}</p>}
                {description && (
                  <p className="text-sm"><span className="text-muted-foreground">Descricao:</span> {description}</p>
                )}
              </div>
            </div>

            {/* Data sources summary */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-emerald-500" />
                Fontes de Dados
              </h3>
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap gap-2">
                  {DATA_SOURCES.filter(ds => ds.id === "csv" || dataSources[ds.id]?.enabled).map(ds => (
                    <Badge key={ds.id} variant="secondary" className="gap-1.5">
                      <ds.icon className="h-3 w-3" />
                      {ds.name}
                      {!ds.implemented && <span className="text-[10px] opacity-60">(em breve)</span>}
                    </Badge>
                  ))}
                </div>
                {dataSources["ibm-rtc"]?.enabled && dataSources["ibm-rtc"].url && (
                  <p className="text-xs text-muted-foreground mt-2">
                    IBM RTC: {dataSources["ibm-rtc"].url} ({dataSources["ibm-rtc"].projects || "sem project area"})
                  </p>
                )}
              </div>
            </div>

            {/* Squads summary */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Squads ({squads.filter(s => s.name).length})
              </h3>
              <div className="rounded-lg border p-4">
                {squads.filter(s => s.name).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma squad cadastrada</p>
                ) : (
                  <div className="space-y-1">
                    {squads.filter(s => s.name).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="font-medium">{s.name}</span>
                        {s.leader && <span className="text-muted-foreground">PO: {s.leader}</span>}
                        {s.techLead && <span className="text-muted-foreground">TL: {s.techLead}</span>}
                        {s.appsec && <span className="text-muted-foreground">AppSec: {s.appsec}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!canProceed()}
          >
            Proximo
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Concluir Setup
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
