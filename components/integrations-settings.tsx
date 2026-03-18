"use client"

import { useState, useEffect } from "react"
import {
  Link2,
  RefreshCw,
  Settings2,
  CheckCircle,
  Download,
  Upload,
  ArrowRight,
  FileText,
  FileCode,
  ClipboardPaste,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { integracaoJira } from "@/lib/mock-data"
import { authHeaders } from "@/lib/auth"
import { cn } from "@/lib/utils"

const mapeamentoCampos = [
  { jira: 'Summary', vulnControl: 'Título' },
  { jira: 'Description', vulnControl: 'Descrição' },
  { jira: 'Priority', vulnControl: 'Criticidade' },
  { jira: 'Assignee', vulnControl: 'Responsável' },
  { jira: 'Team', vulnControl: 'Squad' },
  { jira: 'Due Date', vulnControl: 'SLA' },
  { jira: 'Issue Key', vulnControl: 'Jira' },
  { jira: 'CVSS (Custom Field)', vulnControl: 'Score' },
  { jira: 'Asset (Custom Field)', vulnControl: 'Ativo' },
  { jira: 'Attachment', vulnControl: 'Evidência' },
]

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:9001`
  }
  return 'http://localhost:9001'
}

const API_URL = getApiUrl()

const historicoImportacao = [
  { data: '2025-03-12 14:30', tipo: 'Jira Sync', registros: 12, status: 'Sucesso' },
  { data: '2025-03-11 09:00', tipo: 'Jira Sync', registros: 8, status: 'Sucesso' },
  { data: '2025-03-10 15:45', tipo: 'CSV Import', registros: 25, status: 'Sucesso' },
  { data: '2025-03-08 11:20', tipo: 'Jira Sync', registros: 5, status: 'Sucesso' },
  { data: '2025-03-05 16:00', tipo: 'Excel Import', registros: 45, status: 'Sucesso' },
]

export function IntegrationsSettings() {
  const [syncing, setSyncing] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pastedContent, setPastedContent] = useState("")
  const [dragOver, setDragOver] = useState(false)

  // Jira Config State
  const [jiraUrl, setJiraUrl] = useState("")
  const [jiraEmail, setJiraEmail] = useState("")
  const [jiraToken, setJiraToken] = useState("")
  const [jiraProjetos, setJiraProjetos] = useState("")

  useEffect(() => {
    fetch(`${API_URL}/api/jira/settings`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.url) setJiraUrl(data.url)
        if (data.email) setJiraEmail(data.email)
        if (data.token) setJiraToken(data.token)
        if (data.projects) setJiraProjetos(data.projects)
      })
      .catch(err => console.error("Could not fetch Jira settings", err))
  }, [])

  const [regras, setRegras] = useState({
    apenasLabelVulnerabilidade: true,
    apenasCriticasExtremas: false,
    importarDescricao: true,
    importarCvss: true,
    importarCwe: true,
    importarOwasp: true,
    importarEvidencias: true,
    importarAnexos: true,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      const resp = await fetch(`${API_URL}/api/jira/sync`, {
        method: "POST",
        headers: { ...authHeaders() }
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "Erro ao sincronizar")
      toast.success("Sincronização concluída", { description: data.message })
    } catch (e: any) {
      toast.error("Erro na Sincronização", { description: e.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleConnect = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/jira/settings`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: JSON.stringify({ url: jiraUrl, email: jiraEmail, token: jiraToken, projects: jiraProjetos })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)
      toast.success("Jira conectado")
      setConnectDialogOpen(false)
    } catch (e: any) {
      toast.error("Erro ao salvar credenciais", { description: e.message })
    }
  }

  const importContent = async (text: string, source: string) => {
    if (!text.trim()) {
      toast.error('Conteúdo vazio', { description: 'Cole ou arraste um arquivo com dados.' })
      return
    }

    setImporting(true)
    try {
      const trimmed = text.trimStart()
      const isXml = trimmed.startsWith('<') || trimmed.startsWith('<!--')
      const isJson = trimmed.startsWith('[') || trimmed.startsWith('{')

      if (isXml) {
        const resp = await fetch(`${API_URL}/api/vulnerabilities/import-xml`, {
          method: 'POST',
          headers: { ...authHeaders() },
          body: JSON.stringify({ xml: text }),
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Erro ao importar XML')
        toast.success(`XML importado (${source})`, {
          description: `${data.imported || 0} vulnerabilidades importadas, ${data.errors?.length || 0} erros`
        })
        setPastedContent("")
      } else if (isJson) {
        let payload = JSON.parse(text)
        if (!Array.isArray(payload)) {
          if (payload.issues) payload = payload.issues
          else if (payload.data) payload = payload.data
          else payload = [payload]
        }
        const resp = await fetch(`${API_URL}/api/vulnerabilities/import`, {
          method: 'POST',
          headers: { ...authHeaders() },
          body: JSON.stringify(payload),
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Erro ao importar JSON')
        toast.success(`JSON importado (${source})`, {
          description: `${data.imported || 0} vulnerabilidades importadas, ${data.errors?.length || 0} erros`
        })
        setPastedContent("")
      } else {
        throw new Error('Formato não reconhecido. O conteúdo deve começar com < (XML) ou [ / { (JSON).')
      }
    } catch (err: any) {
      toast.error('Erro na importação', { description: err.message })
    } finally {
      setImporting(false)
    }
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const text = await file.text()
    importContent(text, `arquivo ${file.name}`)
  }

  const handleFileSelect = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xml,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      importContent(text, `arquivo ${file.name}`)
    }
    input.click()
  }

  const toggleRegra = (key: keyof typeof regras) => {
    setRegras(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success("Regra atualizada")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold">Gestão de Integrações</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConnectDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Configurar Jira
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sincronizar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <Link2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Atlassian Jira</CardTitle>
                  <CardDescription>Sincronização bidirecional de issues</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Conectado
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">URL</p>
                  <p className="text-sm font-medium truncate">{integracaoJira.urlInstancia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Projetos</p>
                  <p className="text-sm font-medium">{integracaoJira.projetosMonitorados.join(', ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Última Sync</p>
                  <p className="text-sm font-medium">{integracaoJira.ultimaSincronizacao}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Issues</p>
                  <p className="text-lg font-bold text-primary">{integracaoJira.issuesImportadas}</p>
                </div>
              </div>
              
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(regras).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Label>
                    <Switch id={key} checked={value} onCheckedChange={() => toggleRegra(key as any)} />
                  </div>
                ))}
              </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Importar Dados
            </CardTitle>
            <CardDescription>XML do Jira ou JSON de vulnerabilidades</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="file" className="flex-1 text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Arquivo
                </TabsTrigger>
                <TabsTrigger value="paste" className="flex-1 text-xs gap-1.5">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Colar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                {/* Drop Zone */}
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer",
                    dragOver
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50",
                    importing && "opacity-50 pointer-events-none"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={handleFileSelect}
                >
                  {importing ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                  )}
                  <p className="text-sm font-medium text-foreground mb-1">
                    {importing ? 'Importando...' : 'Arraste o arquivo aqui'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou clique para selecionar
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <FileCode className="h-3 w-3" /> .xml
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <FileText className="h-3 w-3" /> .json
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paste" className="space-y-3">
                <Textarea
                  placeholder={'Cole aqui o conteúdo XML ou JSON...\n\nExemplo XML:\n<rss><channel><item>...</item></channel></rss>\n\nExemplo JSON:\n[{"key":"VUL-001", "resumo":"..."}]'}
                  className="min-h-[180px] font-mono text-xs"
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  disabled={importing}
                />
                <div className="flex items-center gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => importContent(pastedContent, 'colado')}
                    disabled={importing || !pastedContent.trim()}
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {importing ? 'Importando...' : 'Importar'}
                  </Button>
                  {pastedContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPastedContent("")}
                      disabled={importing}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-[10px] text-muted-foreground mt-3 px-1">
              <strong>XML:</strong> Jira → Filtros → Export XML/RSS<br/>
              <strong>JSON:</strong> Array com campos key, resumo, prioridade, status, squadResponsavel, etc.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Mapeamento de Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {mapeamentoCampos.map((m) => (
              <div key={m.jira} className="flex items-center gap-2 rounded border border-border bg-muted/50 p-2 text-[10px]">
                <span className="text-muted-foreground">{m.jira}</span>
                <ArrowRight className="h-2 w-2 text-muted-foreground" />
                <span className="font-semibold text-foreground">{m.vulnControl}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conectar Jira</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="URL" value={jiraUrl} onChange={e => setJiraUrl(e.target.value)} />
            <Input placeholder="Email" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)} />
            <Input type="password" placeholder="Token" value={jiraToken} onChange={e => setJiraToken(e.target.value)} />
            <Input placeholder="Projetos" value={jiraProjetos} onChange={e => setJiraProjetos(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleConnect}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
