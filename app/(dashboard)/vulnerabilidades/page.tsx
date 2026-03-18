"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  RefreshCw,
  Download,
  Upload,
  Plus,
  Search,
  Eye,
  ExternalLink,
  Bell,
  UserPlus,
  Settings2,
  FileText,
  Filter,
  X,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { SeverityBadge } from "@/components/severity-badge"
import { StatusBadge } from "@/components/status-badge"
import { useVulnStore } from "@/lib/vuln-store"
import { toast } from "sonner"
import type { Status } from "@/lib/types"

const statusOptions: Status[] = [
  'Nova',
  'Aberta',
  'Em Backlog',
  'Em Correção',
  'Em Reteste',
  'Mitigada',
  'Concluída',
  'Risco Aceito',
  'Fechada'
]

const criticidadeOptions = [
  'Todas',
  'Extrema',
  'Crítica',
  'Alta',
  'Média',
  'Baixa',
  'Informativa'
]

const responsaveis = [
  'João Silva',
  'Ana Costa',
  'Carlos Mendes',
  'Lucas Ferreira',
  'Maria Santos',
  'Pedro Lima'
]

export default function VulnerabilidadesPage() {
  const { vulnerabilidades, fetchVulnerabilidades, syncJira, updateStatus, updateResponsavel, sendNotification, deleteVulnerabilidade, importData, error } = useVulnStore()
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showVencidas, setShowVencidas] = useState(false)
  const [selectedCriticidade, setSelectedCriticidade] = useState<string>("Todas")
  const [selectedStatus, setSelectedStatus] = useState<string>("Todos")
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("Todos")
  const [selectedSquad, setSelectedSquad] = useState<string>("Todas")
  const [diasEmAbertoMin, setDiasEmAbertoMin] = useState("")

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [responsavelDialogOpen, setResponsavelDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [selectedVulnId, setSelectedVulnId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<Status>("Aberta")
  const [newResponsavel, setNewResponsavel] = useState("")

  useEffect(() => {
    if (error) {
      toast.error('Erro no Servidor', { description: error })
    }
  }, [error])

  useEffect(() => {
    fetchVulnerabilidades()
  }, [])

  const filteredVulnerabilidades = useMemo(() => {
    return vulnerabilidades.filter((vuln) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matches =
          vuln.titulo.toLowerCase().includes(search) ||
          vuln.id.toLowerCase().includes(search) ||
          vuln.jiraKey?.toLowerCase().includes(search) ||
          vuln.squad.toLowerCase().includes(search) ||
          vuln.sistema.toLowerCase().includes(search) ||
          vuln.ativo.toLowerCase().includes(search)
        if (!matches) return false
      }

      // Vencidas filter
      if (showVencidas) {
        if (!vuln.sla) return false
        const isResolved = ['Mitigada', 'Concluída', 'Risco Aceito', 'Fechada'].includes(vuln.status)
        if (isResolved || new Date() <= new Date(vuln.sla)) return false
      }

      // Responsável filter
      if (selectedResponsavel !== 'Todos') {
        if (selectedResponsavel === 'Sem Responsável') {
          if (vuln.responsavel) return false
        } else if (vuln.responsavel !== selectedResponsavel) {
          return false
        }
      }

      // Criticidade filter
      if (selectedCriticidade !== 'Todas' && vuln.criticidade !== selectedCriticidade) return false

      // Status filter
      if (selectedStatus !== 'Todos' && vuln.status !== selectedStatus) return false

      // Squad filter
      if (selectedSquad !== 'Todas' && vuln.squad !== selectedSquad) return false

      // Dias em aberto filter
      if (diasEmAbertoMin && vuln.diasEmAberto < parseInt(diasEmAbertoMin)) return false

      return true
    })
  }, [vulnerabilidades, searchTerm, showVencidas, selectedResponsavel, selectedCriticidade, selectedStatus, selectedSquad, diasEmAbertoMin])

  const uniqueSquads = useMemo(() => {
    const squads = Array.from(new Set(vulnerabilidades.map(v => v.squad))).filter(Boolean)
    return ['Todas', ...squads.sort()]
  }, [vulnerabilidades])

  const uniqueResponsaveis = useMemo(() => {
    const resps = Array.from(new Set(vulnerabilidades.map(v => v.responsavel).filter((r): r is string => !!r)))
    return ['Todos', 'Sem Responsável', ...resps.sort()]
  }, [vulnerabilidades])

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      syncJira()
      setSyncing(false)
      toast.success("Sincronização com Jira concluída", {
        description: `${vulnerabilidades.filter(v => v.jiraKey).length} issues atualizadas.`
      })
    }, 1500)
  }


  const handleImportSubmit = async () => {
    if (!importJson.trim()) {
      toast.error('JSON vazio', { description: 'Cole o JSON do Jira antes de importar.' })
      return
    }

    try {
      setIsImporting(true)
      let parsedData;
      try {
        parsedData = JSON.parse(importJson);
      } catch (parseError) {
        // Fallback: Tenta consertar URLs não quotadas (como do Jira) linha a linha de forma segura
        try {
          let lines = importJson.split('\n');
          for (let i = 0; i < lines.length; i++) {
            // Se encontrar a estrutura exata: chave + dois-pontos + url solta (http/https) + virgula opcional no final
            const match = lines[i].match(/^(\s*"[a-zA-Z0-9_]+"\s*:\s*)(https?:\/\/[^,\s]+)(,?)\s*$/);
            if (match) {
              lines[i] = match[1] + '"' + match[2] + '"' + match[3];
            }
          }
          let fixedJsonStr = lines.join('\n');
          parsedData = new Function("return " + fixedJsonStr.trim())();
        } catch (evalError: any) {
          throw new Error('O texto colado não é um JSON nem um Array JavaScript válido. (' + evalError.message + ')')
        }
      }
      
      if (!Array.isArray(parsedData)) {
        throw new Error('O JSON precisa ser um Array (começar com [ e terminar com ])')
      }

      const result = await importData(parsedData)
      
      toast.success('Importação concluída', {
        description: `${result.imported} vulnerabilidades importadas/atualizadas com sucesso.`
      })
      
      setImportDialogOpen(false)
      setImportJson("")
      
    } catch (e: any) {
      toast.error('Erro na importação', {
        description: e.message || 'JSON inválido ou erro no servidor.'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleOpenJira = (jiraKey: string) => {
    window.open(`https://credsystem.atlassian.net/browse/${jiraKey}`, '_blank')
    toast.success("Abrindo Jira", {
      description: `Ticket ${jiraKey} aberto em nova aba.`
    })
  }

  const handleNotify = (vulnId: string) => {
    sendNotification(vulnId)
    toast.success("Notificação enviada", {
      description: "A squad foi notificada por e-mail."
    })
  }

  const openStatusDialog = (vulnId: string, currentStatus: Status) => {
    setSelectedVulnId(vulnId)
    setNewStatus(currentStatus)
    setStatusDialogOpen(true)
  }

  const handleUpdateStatus = () => {
    if (selectedVulnId) {
      updateStatus(selectedVulnId, newStatus)
      toast.success("Status atualizado", {
        description: `Vulnerabilidade alterada para ${newStatus}.`
      })
      setStatusDialogOpen(false)
    }
  }

  const handleDelete = (vulnId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta vulnerabilidade (" + vulnId + ")? Esta ação é irreversível e o pentester precisará cadastrá-la novamente se necessário.")) {
      deleteVulnerabilidade(vulnId)
      toast.success("Vulnerabilidade excluída e removida da base", {
        description: `O item ${vulnId} foi removido com sucesso.`
      })
    }
  }

  const openResponsavelDialog = (vulnId: string) => {
    setSelectedVulnId(vulnId)
    setNewResponsavel("")
    setResponsavelDialogOpen(true)
  }

  const handleUpdateResponsavel = () => {
    if (selectedVulnId && newResponsavel) {
      updateResponsavel(selectedVulnId, newResponsavel)
      toast.success("Responsável atribuído", {
        description: `${newResponsavel} agora é responsável pela vulnerabilidade.`
      })
      setResponsavelDialogOpen(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setShowVencidas(false)
    setSelectedResponsavel("Todos")
    setSelectedStatus("Todos")
    setSelectedSquad("Todas")
    setDiasEmAbertoMin("")
    setSelectedCriticidade("Todas")
  }

  const hasActiveFilters = searchTerm || showVencidas || selectedResponsavel !== "Todos" || selectedStatus !== "Todos" || selectedSquad !== "Todas" || diasEmAbertoMin || selectedCriticidade !== "Todas"

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vulnerabilidades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhamento centralizado do backlog de falhas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Jira
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Dados
          </Button>
          <Link href="/vulnerabilidades/nova">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vulnerabilidade
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-card border-border shadow-sm transition-all hover:shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Row 1: Search and Operational */}
            <div className="lg:col-span-2">
              <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ID, título, squad, sistema..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 bg-muted border-border focus:bg-card transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-11 bg-muted border-border focus:bg-card transition-all">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criticidade</Label>
              <Select value={selectedCriticidade} onValueChange={setSelectedCriticidade}>
                <SelectTrigger className="h-11 bg-muted border-border focus:bg-card transition-all">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {criticidadeOptions.map((crit) => (
                    <SelectItem key={crit} value={crit}>{crit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Responsibility, Squad and Metrics */}
            <div className="space-y-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</Label>
              <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                <SelectTrigger className="h-11 bg-muted border-border focus:bg-card transition-all">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por nome" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {uniqueResponsaveis.map((resp) => (
                    <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Squad</Label>
              <Select value={selectedSquad} onValueChange={setSelectedSquad}>
                <SelectTrigger className="h-11 bg-muted border-border focus:bg-card transition-all">
                  <SelectValue placeholder="Todas as Squads" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSquads.map((squad) => (
                    <SelectItem key={squad} value={squad}>{squad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo em Aberto</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min dias"
                  value={diasEmAbertoMin}
                  onChange={(e) => setDiasEmAbertoMin(e.target.value)}
                  className="h-11 bg-muted border-border focus:bg-card transition-all"
                />
              </div>
            </div>

            <div className="flex items-center h-full pt-6">
              <div className="flex items-center gap-6 px-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vencidas"
                    checked={showVencidas}
                    onCheckedChange={(checked) => setShowVencidas(checked as boolean)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor="vencidas" className="text-sm font-medium cursor-pointer">Vencidas (SLA)</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Exibindo <span className="font-medium text-foreground">{filteredVulnerabilidades.length}</span> de{" "}
          <span className="font-medium text-foreground">{vulnerabilidades.length}</span> vulnerabilidades
        </p>
      </div>

      {/* Table */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="min-w-[200px]">Título</TableHead>
                  <TableHead className="w-28">Criticidade</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-28">Squad</TableHead>
                  <TableHead className="w-28">Sistema</TableHead>
                  <TableHead className="w-28">Responsável</TableHead>
                  <TableHead className="w-24">Jira</TableHead>
                  <TableHead className="w-16 text-center">CVSS</TableHead>
                  <TableHead className="w-24">Criação</TableHead>
                  <TableHead className="w-20 text-center">Dias</TableHead>
                  <TableHead className="w-24">SLA</TableHead>
                  <TableHead className="w-16 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulnerabilidades.map((vuln) => (
                  <TableRow key={vuln.id} className="border-border">
                    <TableCell className="font-mono text-xs">{vuln.id}</TableCell>
                    <TableCell>
                      <Link
                        href={`/vulnerabilidades/${vuln.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {vuln.titulo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={vuln.criticidade} showIcon={vuln.criticidade === 'Extrema'} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={vuln.status} />
                    </TableCell>
                    <TableCell className="text-sm">{vuln.squad}</TableCell>
                    <TableCell className="text-sm">{vuln.sistema}</TableCell>
                    <TableCell className="text-sm">{vuln.responsavel || '-'}</TableCell>
                    <TableCell>
                      {vuln.jiraKey ? (
                        <Badge variant="outline" className="cursor-pointer font-mono text-xs" onClick={() => handleOpenJira(vuln.jiraKey!)}>
                          {vuln.jiraKey}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm font-medium">{vuln.scoreCvss}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{vuln.dataCriacao}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-semibold ${vuln.diasEmAberto > 30 ? 'text-red-500' : 'text-foreground'}`}>
                        {vuln.diasEmAberto}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{vuln.sla}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/vulnerabilidades/${vuln.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhe
                            </Link>
                          </DropdownMenuItem>
                          {vuln.jiraKey && (
                            <DropdownMenuItem onClick={() => handleOpenJira(vuln.jiraKey!)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir no Jira
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleNotify(vuln.id)}>
                            <Bell className="mr-2 h-4 w-4" />
                            Notificar squad
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openResponsavelDialog(vuln.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Atribuir responsável
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openStatusDialog(vuln.id, vuln.status)}>
                            <Settings2 className="mr-2 h-4 w-4" />
                            Alterar status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(vuln.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir permanentemente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredVulnerabilidades.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">Nenhuma vulnerabilidade encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou criar uma nova vulnerabilidade.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Selecione o novo status para a vulnerabilidade.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responsável Dialog */}
      <Dialog open={responsavelDialogOpen} onOpenChange={setResponsavelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Responsável</DialogTitle>
            <DialogDescription>
              Selecione um responsável para a vulnerabilidade.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newResponsavel} onValueChange={setNewResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                {responsaveis.map((resp) => (
                  <SelectItem key={resp} value={resp}>
                    {resp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponsavelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateResponsavel} disabled={!newResponsavel}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import JSON Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importar Dados Jira (JSON)</DialogTitle>
            <DialogDescription>
              Cole o array JSON exportado diretamente do Jira abaixo. O sistema mapeará os campos para o formato interno.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 relative">
            <textarea
              className="w-full h-80 min-h-[300px] p-4 font-mono text-sm border rounded-md bg-muted/50 focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50"
              placeholder="[\n  {\n    'key': 'VUL-123',\n    'resumo': 'Exemplo...\n  }\n]"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              disabled={isImporting}
            />
            {isImporting && (
              <div className="absolute top-4 left-0 right-0 bottom-4 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-md">
                <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-lg font-semibold text-foreground">Importando Dados...</p>
                <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns instantes.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false)
              setImportJson("")
            }} disabled={isImporting}>
              Cancelar
            </Button>
            <Button onClick={handleImportSubmit} disabled={isImporting || !importJson.trim()}>
              {isImporting ? 'Processando...' : 'Processar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
