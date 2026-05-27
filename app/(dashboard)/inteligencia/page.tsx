"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Sparkles, Trash2, User, Loader2, Zap, Lightbulb, ShieldAlert, Code, Network, Hash, Database } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AIDisclosure } from "@/components/ai-disclosure"
import { authHeaders } from "@/lib/auth"

interface PortfolioMatchInfo {
  codigoInterno: string
  titulo: string
  criticidade: string
  owaspCategory: string | null
  ativo: string
  score: number
  reasons: string[]
}

interface MemoryContext {
  recalled: number
  stored: boolean
  drawer: string | null
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: number
  portfolioContext?: {
    used: number
    matches: PortfolioMatchInfo[]
  }
  memoryContext?: MemoryContext
}

const STORAGE_KEY = "unisysguard_hackbot_history"

const QUICK_SUGGESTIONS = [
  { icon: ShieldAlert, label: "Como testar XSS refletido?", prompt: "Como testar XSS refletido num parâmetro de busca?" },
  { icon: Code, label: "Payloads SQLi pra ASP.NET", prompt: "Quais payloads SQLi posso usar contra um endpoint ASP.NET Core? Me dá curl exemplo." },
  { icon: Hash, label: "JWT — checar vulns críticas", prompt: "Cole um JWT decodificado pra você. Quais vulns críticas eu testaria primeiro?" },
  { icon: Network, label: "Interpretar request Burp", prompt: "Vou colar um request capturado no Burp. Me ajude a identificar candidatos a vulnerabilidade." },
  { icon: Lightbulb, label: "OWASP API Top 10", prompt: "Resumo do OWASP API Security Top 10 2023 com checklist rápido pra cada categoria." },
  { icon: Zap, label: "Zekrom DAST — como usar", prompt: "Como uso a skill Zekrom DAST pra validar uma nova API publicada no WSO2?" },
]

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

function renderMessage(content: string) {
  // Simple markdown-ish render: code blocks, bold, line breaks
  const parts = content.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/```\w*\n?/g, "").replace(/```$/, "")
      return (
        <pre key={i} className="my-2 bg-background border rounded-lg p-3 overflow-x-auto text-[11px] font-mono whitespace-pre-wrap break-all">
          {code}
        </pre>
      )
    }
    // bold + line breaks
    const html = part
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">$1</code>')
      .replace(/\n/g, "<br/>")
    return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
  })
}

export default function InteligenciaPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [])

  // Persist + scroll
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
    } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput("")
    const next: Message[] = [...messages, { role: "user", content: msg, timestamp: Date.now() }]
    setMessages(next)
    setLoading(true)
    try {
      const r = await fetch(`${apiUrl()}/api/llm/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Falha")
      setMessages((p) => [...p, {
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
        portfolioContext: data.portfolioContext,
        memoryContext: data.memoryContext,
      }])
    } catch (e: any) {
      setMessages((p) => [...p, { role: "assistant", content: `❌ Erro: ${e.message}`, timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    if (!confirm("Limpar conversa?")) return
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <PageHeader
        icon={Bot}
        title="HackBot · Motor IA"
        subtitle="Auxiliar do pentester — Tira dúvidas, sugere payloads, explica OWASP"
        badge="IA"
        description='Chat conversacional com o Motor IA AISEC. HackBot sugere — você executa (Unisys AI P1.0 · human oversight).'
        actions={
          messages.length > 0 ? (
            <button onClick={clear} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          ) : undefined
        }
      />

      <AIDisclosure purpose="Conversa interativa com o HackBot — auxiliar de pentest" compact={false} />

      {/* Chat area */}
      <div className="flex-1 rounded-xl border bg-card flex flex-col overflow-hidden min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-purple-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">HackBot pronto pra ajudar</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Tira dúvidas técnicas, sugere payloads, interpreta requests, explica frameworks OWASP/CWE/ASVS. Sempre alinhado à Política Unisys AI P1.0.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted hover:border-emerald-500/50 transition text-left text-sm"
                  >
                    <s.icon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-emerald-400" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-500 text-white"
                    : "bg-muted/50 border"
                }`}>
                  {m.role === "user" ? m.content : <div className="prose-sm">{renderMessage(m.content)}</div>}
                  {m.role === "assistant" && m.memoryContext && (m.memoryContext.recalled > 0 || m.memoryContext.stored) && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center gap-3 text-[10px]">
                      {m.memoryContext.recalled > 0 && (
                        <span className="inline-flex items-center gap-1 text-cyan-300 font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                          🧠 MemPalace · {m.memoryContext.recalled} memória(s) recuperada(s)
                        </span>
                      )}
                      {m.memoryContext.stored && (
                        <span className="inline-flex items-center gap-1 text-cyan-300/80 font-mono">
                          💾 salvo (drawer {m.memoryContext.drawer?.slice(0, 8) || "?"})
                        </span>
                      )}
                    </div>
                  )}
                  {m.role === "assistant" && m.portfolioContext && m.portfolioContext.used > 0 && (
                    <div className="mt-3 pt-2 border-t border-emerald-500/20">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold mb-1.5 flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        Live Portfolio Context — {m.portfolioContext.used} vuln(s) do AISEC
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.portfolioContext.matches.map((pm) => (
                          <a
                            key={pm.codigoInterno}
                            href={`/vulnerabilidades`}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition"
                            title={`${pm.titulo} · ${pm.criticidade}${pm.owaspCategory ? ` · ${pm.owaspCategory}` : ""} · score ${pm.score}\n${pm.reasons.join(" · ")}`}
                          >
                            {pm.codigoInterno}
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              pm.criticidade === "CRITICA" ? "bg-red-500" :
                              pm.criticidade === "ALTA" ? "bg-amber-500" :
                              pm.criticidade === "MEDIA" ? "bg-yellow-500" : "bg-emerald-500"
                            }`} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="bg-muted/50 border rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span className="text-muted-foreground">HackBot pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3 bg-card">
          <form
            onSubmit={(e) => { e.preventDefault(); send() }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunta ao HackBot... (ex: 'me dá payloads pra testar IDOR em /api/users/{id}')"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border bg-background text-sm focus:border-emerald-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            HackBot sugere — você executa. Output rotulado "Content Created By/With Use of AI" · Unisys AI P1.0.
          </p>
        </div>
      </div>
    </div>
  )
}
