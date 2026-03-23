"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTheme } from "next-themes"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authHeaders } from "@/lib/auth"
import {
  Loader2,
  RefreshCw,
  Shield,
  AlertTriangle,
  Zap,
  X,
  ExternalLink,
  Clock,
  Users,
  Target,
} from "lucide-react"

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:9001`
  return 'http://localhost:9001'
}
const API_URL = getApiUrl()

// --- Types ---
interface ScenarioNode {
  id: string
  vulnKey: string | null
  label: string
  type: "entry" | "exploit" | "impact"
  criticidade: string | null
}

interface ScenarioEdge {
  source: string
  target: string
  label: string
}

interface AttackScenario {
  id: string
  title: string
  asset: string
  squad: string
  riskLevel: string
  impactCategory: string
  description: string
  nodes: ScenarioNode[]
  edges: ScenarioEdge[]
  recommendation: string
}

// --- Color helpers ---
const getCriticidadeColor = (crit: string | null): string => {
  switch (crit) {
    case "EXTREMA": return "#ef4444"
    case "CRITICA": return "#f97316"
    case "ALTA": return "#eab308"
    case "MEDIA": return "#3b82f6"
    default: return "#8b5cf6"
  }
}

const getRiskBadgeClass = (risk: string): string => {
  switch (risk) {
    case "CRITICO": return "bg-red-500/20 text-red-400 border-red-500/30"
    case "ALTO": return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "MEDIO": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/30"
  }
}

const getImpactIcon = (category: string) => {
  switch (category) {
    case "Fraude Financeira": return "\u{1F4B0}"
    case "Multa LGPD/Regulatoria": return "\u2696\uFE0F"
    case "Indisponibilidade de Servico": return "\u{1F50C}"
    case "Dano Reputacional": return "\u{1F4C9}"
    default: return "\u26A0\uFE0F"
  }
}

// --- Custom Nodes ---
function EntryNode({ data }: { data: any }) {
  return (
    <div
      className="px-5 py-4 rounded-xl border-2 bg-card shadow-lg w-[280px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderColor: getCriticidadeColor(data.criticidade) }}
    >
      <Handle type="source" position={Position.Right} className="!bg-green-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-green-500 shrink-0" />
        {data.vulnKey && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{data.vulnKey}</span>
        )}
      </div>
      <p className="text-sm font-bold text-foreground leading-snug mb-2">{data.label}</p>
      {data.criticidade && (
        <Badge
          className="text-[10px]"
          style={{
            backgroundColor: getCriticidadeColor(data.criticidade) + "20",
            color: getCriticidadeColor(data.criticidade),
            borderColor: getCriticidadeColor(data.criticidade) + "40",
          }}
        >
          {data.criticidade}
        </Badge>
      )}
    </div>
  )
}

function ExploitNode({ data }: { data: any }) {
  return (
    <div
      className="px-5 py-4 rounded-xl border-2 bg-card shadow-lg w-[280px] cursor-pointer hover:shadow-xl transition-shadow"
      style={{ borderColor: getCriticidadeColor(data.criticidade) }}
    >
      <Handle type="target" position={Position.Left} className="!bg-orange-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-orange-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
        {data.vulnKey && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{data.vulnKey}</span>
        )}
      </div>
      <p className="text-sm font-bold text-foreground leading-snug mb-2">{data.label}</p>
      {data.criticidade && (
        <Badge
          className="text-[10px]"
          style={{
            backgroundColor: getCriticidadeColor(data.criticidade) + "20",
            color: getCriticidadeColor(data.criticidade),
            borderColor: getCriticidadeColor(data.criticidade) + "40",
          }}
        >
          {data.criticidade}
        </Badge>
      )}
    </div>
  )
}

function ImpactNode({ data }: { data: any }) {
  return (
    <div className="px-6 py-5 rounded-xl border-2 border-purple-500 bg-gradient-to-br from-purple-500/20 to-red-500/20 shadow-xl w-[260px] ring-4 ring-purple-500/20 hover:ring-purple-500/40 transition-all">
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3" />
      <div className="flex items-center gap-3">
        <span className="text-3xl">{getImpactIcon(data.label)}</span>
        <span className="text-base font-black text-foreground leading-tight">{data.label}</span>
      </div>
    </div>
  )
}

const nodeTypes = {
  entry: EntryNode,
  exploit: ExploitNode,
  impact: ImpactNode,
}

// --- Layout helper: hierarchical left-to-right ---
function layoutNodes(nodes: ScenarioNode[]): Record<string, { x: number; y: number }> {
  const COL_GAP = 350
  const ROW_GAP = 120

  // Group by type (columns)
  const entries = nodes.filter(n => n.type === "entry")
  const exploits = nodes.filter(n => n.type === "exploit")
  const impacts = nodes.filter(n => n.type === "impact")

  const positions: Record<string, { x: number; y: number }> = {}

  // Calculate vertical centering for each column
  const layoutColumn = (col: ScenarioNode[], xPos: number) => {
    const totalHeight = (col.length - 1) * ROW_GAP
    const startY = -totalHeight / 2
    col.forEach((n, idx) => {
      positions[n.id] = { x: xPos, y: startY + idx * ROW_GAP }
    })
  }

  layoutColumn(entries, 0)
  layoutColumn(exploits, COL_GAP)
  layoutColumn(impacts, COL_GAP * 2)

  return positions
}

// --- Scenario Graph Component ---
function ScenarioGraph({
  scenario,
  onNodeClick,
  isDark,
}: {
  scenario: AttackScenario
  onNodeClick: (node: ScenarioNode) => void
  isDark: boolean
}) {
  const positions = useMemo(() => layoutNodes(scenario.nodes), [scenario.nodes])

  const flowNodes: Node[] = scenario.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: positions[n.id] || { x: 0, y: 0 },
    data: { ...n, onClick: () => onNodeClick(n) },
  }))

  const edgeLabelBg = isDark ? "#1e1e2e" : "#ffffff"
  const edgeLabelColor = isDark ? "#a1a1aa" : "#6b7280"
  const edgeLabelBorder = isDark ? "#333" : "#e5e7eb"

  const flowEdges: Edge[] = scenario.edges.map((e, idx) => ({
    id: `e-${scenario.id}-${idx}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#8b5cf6", strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: edgeLabelColor, fontWeight: 600 },
    labelBgStyle: { fill: edgeLabelBg, fillOpacity: 0.95, stroke: edgeLabelBorder, strokeWidth: 1 },
    labelBgPadding: [8, 6] as [number, number],
    labelBgBorderRadius: 6,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
  }))

  const [nodes, , onNodesChange] = useNodesState(flowNodes)
  const [edges, , onEdgesChange] = useEdgesState(flowEdges)

  // Dynamic height based on node count
  const maxPerCol = Math.max(
    scenario.nodes.filter(n => n.type === "entry").length,
    scenario.nodes.filter(n => n.type === "exploit").length,
    scenario.nodes.filter(n => n.type === "impact").length,
  )
  const containerHeight = Math.max(400, maxPerCol * 140 + 100)

  return (
    <div
      className="w-full rounded-lg border border-border overflow-hidden bg-background/50"
      style={{ height: `${containerHeight}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          const scenarioNode = scenario.nodes.find((n) => n.id === node.id)
          if (scenarioNode && scenarioNode.type !== "impact") onNodeClick(scenarioNode)
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          className="!bg-card !border-border !rounded-lg"
          nodeColor={(n) => getCriticidadeColor(n.data?.criticidade as string)}
          maskColor="rgba(0,0,0,0.3)"
        />
        <Background color="hsl(var(--border))" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}

// --- Detail Panel ---
function DetailPanel({
  node,
  onClose,
}: {
  node: ScenarioNode
  onClose: () => void
}) {
  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-card border-l border-border shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Detalhes da Vulnerabilidade</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {node.vulnKey && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono text-sm">
                {node.vulnKey}
              </Badge>
              {node.vulnKey.startsWith("VUL-") && (
                <a
                  href={`https://credmais.atlassian.net/browse/${node.vulnKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:text-purple-400 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Titulo</p>
            <p className="text-sm font-medium text-foreground">{node.label}</p>
          </div>

          {node.criticidade && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Criticidade</p>
              <Badge
                style={{
                  backgroundColor: getCriticidadeColor(node.criticidade) + "20",
                  color: getCriticidadeColor(node.criticidade),
                  borderColor: getCriticidadeColor(node.criticidade) + "40",
                }}
              >
                {node.criticidade}
              </Badge>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Tipo no Grafo</p>
            <Badge variant="outline">
              {node.type === "entry" ? "Ponto de Entrada" : node.type === "exploit" ? "Exploracao" : "Impacto"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main Component ---
export default function AttackGraphTab() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [scenarios, setScenarios] = useState<AttackScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<ScenarioNode | null>(null)
  const [filterSquad, setFilterSquad] = useState<string>("all")
  const [filterCriticidade, setFilterCriticidade] = useState<string>("all")

  const fetchAttackGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/llm/attack-graph`, { headers: authHeaders(), credentials: 'include' })
      const json = await res.json()
      if (json.success && json.data?.scenarios) {
        setScenarios(json.data.scenarios)
      } else if (json.data?.error) {
        setError(json.data.error)
      } else if (json.data?.message) {
        setError(json.data.message)
      } else {
        setScenarios([])
      }
    } catch (err: any) {
      setError("Erro ao conectar com o servidor: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAttackGraph()
  }, [fetchAttackGraph])

  // Extract unique squads for filter
  const squads = useMemo(() => {
    const s = new Set(scenarios.map((sc) => sc.squad))
    return Array.from(s).sort()
  }, [scenarios])

  // Filter scenarios
  const filtered = useMemo(() => {
    return scenarios.filter((sc) => {
      if (filterSquad !== "all" && sc.squad !== filterSquad) return false
      if (filterCriticidade !== "all") {
        const hasCrit = sc.nodes.some(
          (n) => n.criticidade === filterCriticidade
        )
        if (!hasCrit) return false
      }
      return true
    })
  }, [scenarios, filterSquad, filterCriticidade])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
        <p className="text-lg font-medium text-purple-500/80 animate-pulse">
          Gerando cenários de ataque com base nas vulnerabilidades reais...
        </p>
        <p className="text-sm text-muted-foreground">
          Isso pode levar alguns segundos
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="text-lg font-medium text-foreground">Nao foi possivel gerar o Attack Graph</p>
        <p className="text-sm text-muted-foreground max-w-md text-center">{error}</p>
        <Button onClick={fetchAttackGraph} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={filterSquad} onValueChange={setFilterSquad}>
          <SelectTrigger className="w-[200px]">
            <Users className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por Squad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Squads</SelectItem>
            {squads.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCriticidade} onValueChange={setFilterCriticidade}>
          <SelectTrigger className="w-[200px]">
            <AlertTriangle className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filtrar por Criticidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="EXTREMA">Extrema</SelectItem>
            <SelectItem value="CRITICA">Critica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchAttackGraph} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} cenario{filtered.length !== 1 ? "s" : ""} de ataque
        </div>
      </div>

      {/* Scenarios */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Shield className="h-12 w-12 text-green-500" />
          <p className="text-lg font-medium text-foreground">Nenhum cenario de ataque encontrado</p>
          <p className="text-sm text-muted-foreground">
            Ajuste os filtros ou aguarde a importacao de mais vulnerabilidades
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((scenario) => (
            <Card key={scenario.id} className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-lg">{scenario.title}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{scenario.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskBadgeClass(scenario.riskLevel)}>
                      {scenario.riskLevel}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {getImpactIcon(scenario.impactCategory)} {scenario.impactCategory}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" /> {scenario.asset}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {scenario.squad}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScenarioGraph
                  scenario={scenario}
                  onNodeClick={(node) => setSelectedNode(node)}
                  isDark={isDark}
                />
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="text-xs font-semibold text-purple-500 mb-1">Recomendacao</p>
                  <p className="text-sm text-foreground">{scenario.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedNode && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedNode(null)}
          />
          <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
      )}
    </div>
  )
}
