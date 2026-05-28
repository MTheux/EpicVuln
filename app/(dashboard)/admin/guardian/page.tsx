"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Download,
  FileText,
  Award,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatGrid } from "@/components/stat-grid"
import { AIDisclosure } from "@/components/ai-disclosure"
import { authHeaders } from "@/lib/auth"

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

interface SuiteSummary {
  id: string
  name: string
  targetSkill: string
  severity: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA"
  category: string
  description: string
  testCount: number
}

interface RunDetail {
  testId: string
  input: string
  expectedBehavior: string
  pass: boolean
  assertions: Array<{ desc: string; pass: boolean }>
}

interface RunResult {
  suiteId: string
  suiteName: string
  targetSkill: string
  severity: string
  score: number
  status: "verde" | "amarelo" | "vermelho"
  passed: number
  failed: number
  total: number
  runAt: string
  details: RunDetail[]
}

const catColor: Record<string, string> = {
  "bypass-policy": "bg-red-500/15 text-red-300 border-red-500/30",
  "scope-isolation": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "pii-leak": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  hallucination: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "prompt-injection": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  bias: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  compliance: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

const statusBorder: Record<string, string> = {
  verde: "border-emerald-500/50 bg-emerald-500/5",
  amarelo: "border-amber-500/50 bg-amber-500/5",
  vermelho: "border-red-500/50 bg-red-500/5",
}

export default function GuardianPage() {
  const [suites, setSuites] = useState<SuiteSummary[]>([])
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [running, setRunning] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [detail, setDetail] = useState<RunResult | null>(null)
  const [generatingAtt, setGeneratingAtt] = useState(false)

  useEffect(() => {
    fetch(`${apiUrl()}/api/guardian/suites`, { credentials: "include", headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setSuites(d.suites || []))
      .catch(() => {})
  }, [])

  const runSuite = async (id: string) => {
    setRunning(id)
    try {
      const r = await fetch(`${apiUrl()}/api/guardian/run/${id}`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      })
      const data = await r.json()
      if (r.ok) setResults((p) => ({ ...p, [id]: data }))
    } finally {
      setRunning(null)
    }
  }

  const runAll = async () => {
    setRunningAll(true)
    for (const s of suites) {
      await runSuite(s.id)
    }
    setRunningAll(false)
  }

  const totalRun = Object.keys(results).length
  const totalPassClean = Object.values(results).filter((r) => r.failed === 0).length
  const avgScore = totalRun > 0
    ? Math.round(Object.values(results).reduce((a, r) => a + r.score, 0) / totalRun)
    : 0
  const totalFailed = Object.values(results).reduce((a, r) => a + r.failed, 0)

  const generateAttestation = async () => {
    setGeneratingAtt(true)
    try {
      const r = await fetch(`${apiUrl()}/api/guardian/attestation`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      })
      const data = await r.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `aisec-llm-attestation-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setGeneratingAtt(false)
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        icon={Shield}
        title="AISEC Guardian"
        subtitle="Red team interno dos system prompts · Web + API only"
        badge="Novo"
        description="Bateria de testes determinísticos contra os 8 system prompts do AISEC (HackBot, Zekrom, Épicos, Arquitetura, Resumo IA). 10 suites cobrem: bypass de política, prompt injection no input, PII leak via LPC, hallucination de CVE/CWE, escopo Web+API only, bias e compliance Unisys AI P1.0. Inspirado em promptfoo, focado em Caixa (Web ASP.NET + API REST/WSO2 — sem mobile/IoT)."
        actions={
          <div className="flex gap-2">
            <button
              onClick={runAll}
              disabled={runningAll || running !== null}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runningAll ? "Rodando..." : "Rodar TODAS"}
            </button>
            <button
              onClick={generateAttestation}
              disabled={generatingAtt}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/10 transition disabled:opacity-50"
            >
              {generatingAtt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              Gerar Atestado P1.0
            </button>
          </div>
        }
      />

      <StatGrid
        stats={[
          { label: "Postura LLM", value: totalRun > 0 ? `${avgScore}/100` : "—", icon: ShieldCheck, tone: avgScore >= 80 ? "success" : avgScore >= 60 ? "warning" : "danger" },
          { label: "Suites limpas", value: `${totalPassClean}/${suites.length}`, icon: CheckCircle2, tone: "success" },
          { label: "Falhas detectadas", value: totalFailed, icon: AlertTriangle, tone: totalFailed > 0 ? "danger" : "success" },
          { label: "Suites executadas", value: `${totalRun}/${suites.length}`, icon: Sparkles, tone: "info" },
        ]}
      />

      {/* Suite cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suites.map((s) => {
          const r = results[s.id]
          const isRunning = running === s.id
          return (
            <div
              key={s.id}
              className={`rounded-xl border-2 p-4 transition ${r ? statusBorder[r.status] : "bg-card border-border hover:border-emerald-500/30"}`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  {r?.failed === 0 ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> :
                   r?.failed ? <ShieldAlert className="h-4 w-4 text-red-400" /> :
                   <Shield className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="font-bold text-sm">{s.name}</span>
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${catColor[s.category]}`}>
                      {s.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] flex-wrap">
                    <span className="text-emerald-400 font-mono">{s.targetSkill}</span>
                    <span className="text-muted-foreground">· {s.testCount} testes</span>
                    <span className={`uppercase tracking-wider font-bold ${
                      s.severity === "CRITICA" ? "text-red-400" :
                      s.severity === "ALTA" ? "text-amber-400" :
                      s.severity === "MEDIA" ? "text-yellow-400" : "text-emerald-400"
                    }`}>{s.severity}</span>
                  </div>
                </div>
              </div>

              {r && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-[11px] mb-1">
                    <span className={`text-2xl font-black tabular-nums ${
                      r.score >= 80 ? "text-emerald-400" : r.score >= 60 ? "text-amber-400" : "text-red-400"
                    }`}>{r.score}</span>
                    <span className="text-muted-foreground">/100</span>
                    <span className="ml-auto text-emerald-400">{r.passed} pass</span>
                    {r.failed > 0 && <span className="text-red-400">{r.failed} fail</span>}
                  </div>
                  <button
                    onClick={() => setDetail(r)}
                    className="w-full inline-flex items-center justify-between text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Ver detalhe dos testes <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {!r && (
                <button
                  onClick={() => runSuite(s.id)}
                  disabled={isRunning || runningAll}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                  {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  {isRunning ? "Rodando..." : "Run agora"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Disclosure */}
      <div className="mt-6">
        <AIDisclosure
          compact
          purpose="Mock executor determinístico (demo). Em produção: invoca promptfoo via subprocess (https://github.com/promptfoo/promptfoo)."
        />
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border bg-card shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <h3 className="font-bold text-sm truncate">{detail.suiteName}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">{detail.targetSkill} · Score {detail.score}/100 · {detail.passed} pass / {detail.failed} fail</p>
              </div>
              <button onClick={() => setDetail(null)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detail.details.map((d) => (
                <div key={d.testId} className={`rounded-lg border p-3 ${d.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {d.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    <span className="text-xs font-semibold">{d.testId}</span>
                    <span className={`ml-auto text-[9px] uppercase font-bold tracking-wider ${d.pass ? "text-emerald-400" : "text-red-400"}`}>
                      {d.pass ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <div className="text-[11px] space-y-1">
                    <div><span className="text-muted-foreground">Input:</span> <span className="font-mono text-foreground/90">{d.input}</span></div>
                    <div><span className="text-muted-foreground">Esperado:</span> {d.expectedBehavior}</div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                    {d.assertions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        {a.pass ? <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" /> : <X className="h-3 w-3 text-red-400 flex-shrink-0" />}
                        <span className={a.pass ? "text-emerald-300" : "text-red-300"}>{a.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Check(props: any) { return <CheckCircle2 {...props} /> }
