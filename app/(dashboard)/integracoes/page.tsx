"use client"

import { useState, useEffect } from "react"
import {
  Link2,
  RefreshCw,
  Settings2,
  CheckCircle,
  ExternalLink,
  Download,
  Upload,
  FileText,
  Clock,
  Server,
  ArrowRight
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
import { toast } from "sonner"
import { integracaoJira } from "@/lib/mock-data"

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

const historicoImportacao = [
  { data: '2025-03-12 14:30', tipo: 'Jira Sync', registros: 12, status: 'Sucesso' },
  { data: '2025-03-11 09:00', tipo: 'Jira Sync', registros: 8, status: 'Sucesso' },
  { data: '2025-03-10 15:45', tipo: 'CSV Import', registros: 25, status: 'Sucesso' },
  { data: '2025-03-08 11:20', tipo: 'Jira Sync', registros: 5, status: 'Sucesso' },
  { data: '2025-03-05 16:00', tipo: 'Excel Import', registros: 45, status: 'Sucesso' },
]

export default function IntegracoesPage() {
  const [syncing, setSyncing] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false)

  // Jira Config State
  const [jiraUrl, setJiraUrl] = useState("")
  const [jiraEmail, setJiraEmail] = useState("")
  const [jiraToken, setJiraToken] = useState("")
  const [jiraProjetos, setJiraProjetos] = useState("")

  useEffect(() => {
    // Fetch initial settings
    fetch("http://localhost:3001/api/jira/settings")
      .then(r => r.json())
      .then(data => {
        if (data.url) setJiraUrl(data.url)
        if (data.email) setJiraEmail(data.email)
        if (data.token) setJiraToken(data.token)
        if (data.projects) setJiraProjetos(data.projects)
      })
      .catch(err => console.error("Could not fetch Jira settings", err))
  }, [])

  // Regras de ingestão
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
      const resp = await fetch("http://localhost:3001/api/jira/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.error || "Erro ao sincronizar com Jira")
      }

      toast.success("Sincronização concluída", {
        description: data.message
      })
    } catch (e: any) {
      toast.error("Erro na Sincronização", {
        description: e.message
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleConnect = async () => {
    try {
      const resp = await fetch("http://localhost:3001/api/jira/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: jiraUrl,
          email: jiraEmail,
          token: jiraToken,
          projects: jiraProjetos
        })
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error)

      toast.success("Jira conectado", {
        description: data.message || "Integração configurada com sucesso."
      })
      setConnectDialogOpen(false)
    } catch (e: any) {
      toast.error("Erro ao salvar credenciais do Jira", { description: e.message })
    }
  }

  const handleImportCSV = () => {
    toast.info("Importação CSV", {
      description: "Selecione um arquivo CSV para importar vulnerabilidades."
    })
  }

  const handleImportExcel = () => {
    toast.info("Importação Excel", {
      description: "Selecione um arquivo Excel para importar vulnerabilidades."
    })
  }

  const handleDownloadTemplate = () => {
    toast.success("Download iniciado", {
      description: "Template de importação sendo baixado."
    })
  }

  const toggleRegra = (key: keyof typeof regras) => {
    setRegras(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success("Regra atualizada", {
      description: "As configurações de ingestão foram salvas."
    })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
              <p className="text-sm text-muted-foreground">
                Conecte o VulnControl com suas ferramentas de desenvolvimento
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConnectDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Conectar Jira
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Agora
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMappingDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Mapear Campos
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Jira Card */}
        <Card className="bg-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-400" fill="currentColor">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">Jira Software</CardTitle>
                  <CardDescription>Atlassian Jira Integration</CardDescription>
                </div>
              </div>
              <Badge className={integracaoJira.status === 'conectado' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                <CheckCircle className="mr-1 h-3 w-3" />
                {integracaoJira.status === 'conectado' ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">URL da Instância</p>
                <p className="text-sm font-medium text-foreground">{integracaoJira.urlInstancia}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Projetos Monitorados</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {integracaoJira.projetosMonitorados.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Última Sincronização</p>
                <p className="text-sm text-foreground">{integracaoJira.ultimaSincronizacao}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Issues Importadas</p>
                <p className="text-2xl font-bold text-primary">{integracaoJira.issuesImportadas}</p>
              </div>
            </div>

            <Separator />

            {/* Regras de Ingestão */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-foreground">Regras de Ingestão</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="labelVuln" className="text-sm">Importar apenas label "vulnerabilidade"</Label>
                  <Switch
                    id="labelVuln"
                    checked={regras.apenasLabelVulnerabilidade}
                    onCheckedChange={() => toggleRegra('apenasLabelVulnerabilidade')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="criticas" className="text-sm">Importar apenas Críticas/Extremas</Label>
                  <Switch
                    id="criticas"
                    checked={regras.apenasCriticasExtremas}
                    onCheckedChange={() => toggleRegra('apenasCriticasExtremas')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="descricao" className="text-sm">Importar descrição</Label>
                  <Switch
                    id="descricao"
                    checked={regras.importarDescricao}
                    onCheckedChange={() => toggleRegra('importarDescricao')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cvss" className="text-sm">Importar CVSS</Label>
                  <Switch
                    id="cvss"
                    checked={regras.importarCvss}
                    onCheckedChange={() => toggleRegra('importarCvss')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cwe" className="text-sm">Importar CWE</Label>
                  <Switch
                    id="cwe"
                    checked={regras.importarCwe}
                    onCheckedChange={() => toggleRegra('importarCwe')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="owasp" className="text-sm">Importar OWASP</Label>
                  <Switch
                    id="owasp"
                    checked={regras.importarOwasp}
                    onCheckedChange={() => toggleRegra('importarOwasp')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="evidencias" className="text-sm">Importar evidências</Label>
                  <Switch
                    id="evidencias"
                    checked={regras.importarEvidencias}
                    onCheckedChange={() => toggleRegra('importarEvidencias')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="anexos" className="text-sm">Importar anexos</Label>
                  <Switch
                    id="anexos"
                    checked={regras.importarAnexos}
                    onCheckedChange={() => toggleRegra('importarAnexos')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Importação em Lote */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Importação em Lote</CardTitle>
            <CardDescription>Importe vulnerabilidades via arquivos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={handleImportCSV}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleImportExcel}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
            <Separator />
            <Button variant="ghost" className="w-full justify-start" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mapeamento de Campos */}
      <Card className="mt-6 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Mapeamento de Campos</CardTitle>
              <CardDescription>Configuração de correspondência entre Jira e VulnControl</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMappingDialogOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {mapeamentoCampos.map((m) => (
              <div key={m.jira} className="flex items-center gap-2 rounded-lg border border-border p-3">
                <span className="text-xs text-muted-foreground">{m.jira}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{m.vulnControl}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Importações */}
      <Card className="mt-6 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Importações</CardTitle>
          <CardDescription>Últimas sincronizações e importações realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Registros</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoImportacao.map((item, index) => (
                <TableRow key={index} className="border-border">
                  <TableCell className="text-sm">{item.data}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.registros}</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/20 text-green-400">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar ao Jira</DialogTitle>
            <DialogDescription>
              Configure a integração com sua instância do Jira Software.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="jiraUrl">URL da Instância</Label>
              <Input id="jiraUrl" placeholder="https://sua-empresa.atlassian.net" value={jiraUrl} onChange={e => setJiraUrl(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jiraEmail">Email</Label>
              <Input id="jiraEmail" type="email" placeholder="seu-email@empresa.com" value={jiraEmail} onChange={e => setJiraEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jiraToken">API Token</Label>
              <Input id="jiraToken" type="password" placeholder="Seu token de API do Jira" value={jiraToken} onChange={e => setJiraToken(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jiraProjetos">Projetos/Épicos Permitidos (separados por vírgula)</Label>
              <Input id="jiraProjetos" placeholder="SEC, VULN, APPSEC" value={jiraProjetos} onChange={e => setJiraProjetos(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">O sistema criará apenas para o projeto e vulnerabilidades das chaves indicadas (ex: SEC, VULN, APPSEC).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConnect}>
              Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mapeamento de Campos</DialogTitle>
            <DialogDescription>
              Configure como os campos do Jira são mapeados para o VulnControl.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo Jira</TableHead>
                  <TableHead>Campo VulnControl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapeamentoCampos.map((m) => (
                  <TableRow key={m.jira}>
                    <TableCell className="font-medium">{m.jira}</TableCell>
                    <TableCell>{m.vulnControl}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              toast.success("Mapeamento salvo")
              setMappingDialogOpen(false)
            }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
