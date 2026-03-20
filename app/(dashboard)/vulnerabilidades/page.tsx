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
  'Em Backlog',
  'Em Correção',
  'Em Reteste',
  'Mitigada',
  'Concluída',
  'Risco Aceito',
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

      {/* Search + Filters compact */}
      <div className="mb-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, titulo, squad, alvo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-card border-border"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-[150px] bg-card border-border text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCriticidade} onValueChange={setSelectedCriticidade}>
            <SelectTrigger className="h-9 w-[140px] bg-card border-border text-sm">
              <SelectValue placeholder="Criticidade" />
            </SelectTrigger>
            <SelectContent>
              {criticidadeOptions.map((crit) => (
                <SelectItem key={crit} value={crit}>{crit === 'Todas' ? 'Todas Criticidades' : crit}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSquad} onValueChange={setSelectedSquad}>
            <SelectTrigger className="h-9 w-[150px] bg-card border-border text-sm">
              <SelectValue placeholder="Squad" />
            </SelectTrigger>
            <SelectContent>
              {uniqueSquads.map((squad) => (
                <SelectItem key={squad} value={squad}>{squad === 'Todas' ? 'Todas as Squads' : squad}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
            <SelectTrigger className="h-9 w-[160px] bg-card border-border text-sm">
              <SelectValue placeholder="Responsavel" />
            </SelectTrigger>
            <SelectContent>
              {uniqueResponsaveis.map((resp) => (
                <SelectItem key={resp} value={resp}>{resp === 'Todos' ? 'Todos Responsaveis' : resp}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Min dias"
            value={diasEmAbertoMin}
            onChange={(e) => setDiasEmAbertoMin(e.target.value)}
            className="h-9 w-[100px] bg-card border-border text-sm"
          />

          <div className="flex items-center gap-1.5 px-2">
            <Checkbox
              id="vencidas"
              checked={showVencidas}
              onCheckedChange={(checked) => setShowVencidas(checked as boolean)}
              className="h-4 w-4"
            />
            <Label htmlFor="vencidas" className="text-xs font-medium cursor-pointer text-muted-foreground">SLA Vencido</Label>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              const headers = ['ID', 'Titulo', 'Criticidade', 'Status', 'Squad', 'Alvo', 'Responsavel', 'Data Criacao', 'Dias Aberto', 'SLA']
              const rows = filteredVulnerabilidades.map(v => [
                v.id,
                `"${(v.titulo || '').replace(/"/g, '""')}"`,
                v.criticidade,
                v.status,
                v.squad,
                v.sistema || v.ativo || '',
                v.responsavel || '',
                v.dataCriacao || '',
                v.diasEmAberto,
                v.sla || '',
              ].join(';'))
              const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `vulncontrol_export_${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('Exportado!', { description: `${filteredVulnerabilidades.length} vulnerabilidades exportadas para CSV.` })
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        </div>

        {/* Results count + active filter badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredVulnerabilidades.length}</span> de{" "}
            <span className="font-semibold text-foreground">{vulnerabilidades.length}</span> vulnerabilidades
          </p>
          {selectedStatus !== 'Todos' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setSelectedStatus('Todos')}>
              {selectedStatus} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {selectedCriticidade !== 'Todas' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setSelectedCriticidade('Todas')}>
              {selectedCriticidade} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {selectedSquad !== 'Todas' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setSelectedSquad('Todas')}>
              {selectedSquad} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {selectedResponsavel !== 'Todos' && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setSelectedResponsavel('Todos')}>
              {selectedResponsavel} <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {showVencidas && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted bg-red-500/10 text-red-500 border-red-500/20" onClick={() => setShowVencidas(false)}>
              SLA Vencido <X className="h-2.5 w-2.5" />
            </Badge>
          )}
          {diasEmAbertoMin && (
            <Badge variant="outline" className="text-[10px] gap-1 h-5 cursor-pointer hover:bg-muted" onClick={() => setDiasEmAbertoMin('')}>
              {'>='}{diasEmAbertoMin} dias <X className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
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
                  <TableHead className="w-28">Alvo</TableHead>
                  <TableHead className="w-28">Responsável</TableHead>
                  <TableHead className="w-24">Criação</TableHead>
                  <TableHead className="w-20 text-center">Dias</TableHead>
                  <TableHead className="w-24">SLA</TableHead>
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
                    <TableCell className="text-sm">{vuln.sistema || vuln.ativo || '-'}</TableCell>
                    <TableCell className="text-sm">{vuln.responsavel || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{vuln.dataCriacao}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-semibold ${vuln.diasEmAberto > 30 ? 'text-red-500' : 'text-foreground'}`}>
                        {vuln.diasEmAberto}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{vuln.sla}</TableCell>
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
