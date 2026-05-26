"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import {
  Activity,
  Zap,
  Bot,
  BookOpen,
  ShieldAlert,
  Users,
  Hash,
  X,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { authHeaders } from "@/lib/auth"

// react-force-graph é client-side puro, precisa SSR off
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false }) as any

type NodeGroup = "skill" | "motor" | "rag" | "doc" | "vuln" | "squad" | "request" | "hackbot" | "tool"

interface GraphNode {
  id: string
  label: string
  group: NodeGroup
  size: number
  color: string
  meta?: any
  x?: number
  y?: number
}
interface GraphEdge {
  source: string
  target: string
  weight?: number
  type?: "static" | "live"
  label?: string
}
interface ActivityEvent {
  ts: number
  fromId: string
  toId: string
  action: string
  preview?: string
}
interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activity: ActivityEvent[]
  stats?: any
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

const GROUP_LABEL: Record<NodeGroup, string> = {
  skill: "Skill", motor: "Motor IA", rag: "RAG", doc: "Documento",
  vuln: "Vulnerabilidade", squad: "Squad", request: "Burp Request", hackbot: "HackBot", tool: "Tool",
}
const GROUP_ICON: Record<NodeGroup, any> = {
  skill: Zap, motor: Sparkles, rag: BookOpen, doc: BookOpen,
  vuln: ShieldAlert, squad: Users, request: Hash, hackbot: Bot, tool: Sparkles,
}

const FILTER_GROUPS: NodeGroup[] = ["skill", "motor", "rag", "doc", "vuln", "squad", "request", "hackbot"]

export default function ActivityGraphPage() {
  const [data, setData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [nodeLogs, setNodeLogs] = useState<ActivityEvent[]>([])
  const [hidden, setHidden] = useState<Set<NodeGroup>>(new Set())
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set())
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const fetchGraph = useCallback(async () => {
    try {
      const r = await fetch(`${apiUrl()}/api/activity/graph`, {
        credentials: "include",
        headers: authHeaders(),
      })
      if (!r.ok) return
      const json: GraphData = await r.json()
      // Defensive: ensure required fields exist
      const safe: GraphData = {
        nodes: Array.isArray(json.nodes) ? json.nodes : [],
        edges: Array.isArray(json.edges) ? json.edges : [],
        activity: Array.isArray(json.activity) ? json.activity : [],
        stats: json.stats || { nodes: 0, edges: 0 },
      }
      setData(safe)
      const recent = new Set(safe.activity.slice(0, 5).flatMap((e) => [e?.fromId, e?.toId]).filter(Boolean) as string[])
      setPulseIds(recent)
    } catch {}
  }, [])

  useEffect(() => { fetchGraph() }, [fetchGraph])
  // polling 5s
  useEffect(() => {
    const i = setInterval(fetchGraph, 5000)
    return () => clearInterval(i)
  }, [fetchGraph])

  // size observer for canvas
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height })
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // node click → fetch logs
  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node)
    try {
      const r = await fetch(`${apiUrl()}/api/activity/node/${encodeURIComponent(node.id)}/logs`, {
        credentials: "include",
        headers: authHeaders(),
      })
      if (r.ok) {
        const { logs } = await r.json()
        setNodeLogs(logs || [])
      }
    } catch {}
  }, [])

  // graphData formatado SOMENTE pro ForceGraph2D — usa `links` (não `edges`)
  // e referencias completamente novas a cada render pra evitar mutation interna.
  const graphData = useMemo(() => {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return { nodes: [], links: [] }
    }
    const visibleIds = new Set(
      data.nodes.filter((n) => n && n.id && !hidden.has(n.group)).map((n) => n.id),
    )
    const nodes = data.nodes
      .filter((n) => n && n.id && visibleIds.has(n.id))
      .map((n) => ({
        id: String(n.id),
        label: String(n.label || n.id),
        group: n.group,
        size: Number(n.size) || 8,
        color: n.color || '#10b981',
        meta: n.meta,
      }))
    const links = data.edges
      .filter((e) => {
        if (!e) return false
        const s = typeof e.source === "string" ? e.source : (e.source as any)?.id
        const t = typeof e.target === "string" ? e.target : (e.target as any)?.id
        return !!s && !!t && visibleIds.has(s) && visibleIds.has(t)
      })
      .map((e) => ({
        source: typeof e.source === "string" ? e.source : (e.source as any).id,
        target: typeof e.target === "string" ? e.target : (e.target as any).id,
        type: e.type || 'static',
        weight: e.weight,
        label: e.label,
      }))
    return { nodes, links }
  }, [data, hidden])

  // Key pra forçar re-mount do ForceGraph2D em mudanças (evita mutation entre polls)
  const graphKey = useMemo(
    () => `g-${graphData.nodes.length}-${graphData.links.length}-${data?.activity?.length || 0}`,
    [graphData, data],
  )

  const toggleGroup = (g: NodeGroup) => {
    setHidden((p) => {
      const n = new Set(p)
      n.has(g) ? n.delete(g) : n.add(g)
      return n
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader
        icon={Activity}
        title="Activity Graph"
        subtitle="Visualização em tempo real do framework agêntico"
        badge="Live"
        description="Skills, motores, documentos, vulnerabilidades, squads e requests interconectados. Pulse em nós com atividade recente. Clique em qualquer node pra ver logs e ações."
        actions={
          <button
            onClick={fetchGraph}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar agora
          </button>
        }
      />

      {/* Filters legend */}
      <div className="rounded-xl border bg-card p-3 mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mr-2">Filtros</span>
        {FILTER_GROUPS.map((g) => {
          const Icon = GROUP_ICON[g]
          const isOff = hidden.has(g)
          const count = data?.nodes.filter((n) => n.group === g).length || 0
          return (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                isOff
                  ? "border-border bg-muted text-muted-foreground opacity-50"
                  : "border-emerald-500/30 bg-emerald-500/5 text-foreground"
              }`}
            >
              {isOff ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <Icon className="h-3 w-3" />
              {GROUP_LABEL[g]}
              <span className="text-muted-foreground tabular-nums">({count})</span>
            </button>
          )
        })}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {data?.stats.nodes} nodes · {data?.stats.edges} edges · refresh 5s
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 min-h-0">
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="rounded-xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative"
        >
          {graphData.nodes.length > 0 && (
            <ForceGraph2D
              key={graphKey}
              ref={graphRef}
              graphData={graphData}
              width={size.w}
              height={size.h}
              backgroundColor="rgba(0,0,0,0)"
              nodeLabel={(n: any) => `${GROUP_LABEL[n.group as NodeGroup] || n.group} · ${n.label}`}
              nodeRelSize={4}
              nodeCanvasObject={(node: any, ctx: any, scale: number) => {
                if (!node || node.x == null || node.y == null) return
                const r = (node.size || 8) / Math.sqrt(scale)
                const isPulse = pulseIds.has(node.id)
                const isSel = selectedNode?.id === node.id

                // pulse halo
                if (isPulse) {
                  const t = (Date.now() % 1500) / 1500
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, r + 6 + Math.sin(t * Math.PI * 2) * 3, 0, 2 * Math.PI)
                  ctx.fillStyle = `${node.color}33`
                  ctx.fill()
                }

                // selection ring
                if (isSel) {
                  ctx.beginPath()
                  ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI)
                  ctx.strokeStyle = "#10b981"
                  ctx.lineWidth = 2 / scale
                  ctx.stroke()
                }

                // main circle
                ctx.beginPath()
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
                ctx.fillStyle = node.color
                ctx.fill()

                // label (only if scale is decent)
                if (scale > 0.6) {
                  const label = String(node.label || '').slice(0, 22)
                  const fontSize = Math.max(2.5, 11 / scale)
                  ctx.font = `${fontSize}px Inter, sans-serif`
                  ctx.textAlign = "center"
                  ctx.textBaseline = "top"
                  ctx.fillStyle = "rgba(255,255,255,0.85)"
                  ctx.fillText(label, node.x, node.y + r + 2)
                }
              }}
              linkColor={(l: any) => (l?.type === "live" ? "#10b981" : "rgba(255,255,255,0.08)")}
              linkWidth={(l: any) => (l?.type === "live" ? 1.8 : 0.6)}
              linkDirectionalParticles={(l: any) => (l?.type === "live" ? 3 : 0)}
              linkDirectionalParticleSpeed={() => 0.008}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleColor={() => "#10b981"}
              onNodeClick={handleNodeClick}
              cooldownTicks={150}
              d3AlphaDecay={0.025}
              d3VelocityDecay={0.35}
              warmupTicks={50}
            />
          )}
          {!data && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Carregando grafo...
            </div>
          )}

          {/* Live indicator */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · 5s
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-xl border bg-card overflow-y-auto flex flex-col min-h-0">
          {!selectedNode ? (
            <>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" /> Atividade Recente
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Últimos eventos do framework</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {data?.activity.slice(0, 30).map((ev, i) => (
                  <div key={i} className="p-3 hover:bg-muted/30 transition text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">{ev.action}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {Math.round((Date.now() - ev.ts) / 1000)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <code className="text-emerald-400">{ev.fromId}</code>
                      <span className="text-muted-foreground">→</span>
                      <code className="text-sky-400">{ev.toId}</code>
                    </div>
                    {ev.preview && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-2">"{ev.preview}"</p>
                    )}
                  </div>
                ))}
                {!data?.activity?.length && (
                  <div className="p-6 text-center text-xs text-muted-foreground">Sem atividade ainda</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = GROUP_ICON[selectedNode.group]
                      return (
                        <div className="h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${selectedNode.color}20`, borderColor: `${selectedNode.color}50` }}>
                          <Icon className="h-4 w-4" style={{ color: selectedNode.color }} />
                        </div>
                      )
                    })()}
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                        {GROUP_LABEL[selectedNode.group]}
                      </div>
                      <h3 className="font-bold text-sm truncate">{selectedNode.label}</h3>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedNode(null); setNodeLogs([]) }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {selectedNode.meta && (
                  <pre className="text-[10px] bg-background/50 p-2 rounded border font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all max-h-24">
                    {JSON.stringify(selectedNode.meta, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 border-b text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Logs deste node ({nodeLogs.length})
                </div>
                <div className="divide-y">
                  {nodeLogs.map((ev, i) => (
                    <div key={i} className="p-3 hover:bg-muted/30 transition text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">{ev.action}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(ev.ts).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <code className={ev.fromId === selectedNode.id ? "text-emerald-400" : "text-sky-400"}>{ev.fromId}</code>
                        <span className="text-muted-foreground">→</span>
                        <code className={ev.toId === selectedNode.id ? "text-emerald-400" : "text-sky-400"}>{ev.toId}</code>
                      </div>
                      {ev.preview && (
                        <p className="text-[10px] text-muted-foreground mt-1 italic">"{ev.preview}"</p>
                      )}
                    </div>
                  ))}
                  {!nodeLogs.length && (
                    <div className="p-6 text-center text-xs text-muted-foreground">Sem logs deste node</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
