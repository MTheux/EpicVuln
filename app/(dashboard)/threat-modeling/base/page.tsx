"use client"

import { useState, useRef, useEffect } from "react"
import { BookOpen, Upload, FileText, X, CheckCircle2, Loader2, Search, Sparkles, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { authHeaders } from "@/lib/auth"

interface Doc {
  docId: string
  docName: string
  chunkCount: number
  createdAt: string
}

interface QueryResult {
  docId: string
  docName: string
  chunkIndex: number
  content: string
  similarity: number
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

const fmtSize = (chunkCount: number) => `${chunkCount} chunks · ~${Math.round((chunkCount * 800) / 1024)} KB`

export default function BaseConhecimentoPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [embedder, setEmbedder] = useState<string | null>(null)

  // Query playground
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<QueryResult[]>([])
  const [searching, setSearching] = useState(false)

  const loadDocs = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${apiUrl()}/api/rag/docs`, { credentials: "include", headers: authHeaders() })
      const data = await r.json()
      if (Array.isArray(data)) setDocs(data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadDocs() }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    for (const file of Array.from(files)) {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("file", file)
        const r = await fetch(`${apiUrl()}/api/rag/ingest`, {
          method: "POST",
          credentials: "include",
          body: fd,
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Falha no ingest")
        setEmbedder(data.embedder)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setUploading(false)
      }
    }
    loadDocs()
  }

  const removeDoc = async (docId: string) => {
    if (!confirm("Remover documento e todos os chunks?")) return
    await fetch(`${apiUrl()}/api/rag/docs/${docId}`, { method: "DELETE", credentials: "include", headers: authHeaders() })
    loadDocs()
  }

  const runQuery = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const r = await fetch(`${apiUrl()}/api/rag/query`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query, topK: 5 }),
      })
      const data = await r.json()
      if (Array.isArray(data.results)) setResults(data.results)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSearching(false)
    }
  }

  const totalChunks = docs.reduce((a, d) => a + d.chunkCount, 0)

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Base de Conhecimento"
        subtitle="RAG · pgvector · embeddings semânticos"
        badge="F11"
        description="Documentos ingeridos viram chunks vetoriais consultáveis por similaridade. Skills do AISEC usam essa base como contexto adicional via RAG."
        actions={
          <button onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Indexando..." : "Upload"}
          </button>
        }
      />

      {/* Status banner — RAG real ativo */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-xs">
          <div className="font-semibold text-emerald-300 mb-1">RAG real ativo · pgvector + embeddings semânticos</div>
          <p className="text-emerald-200/80 leading-relaxed">
            Os documentos viram chunks de ~800 chars, são embeddados, e indexados via pgvector (cosine similarity).
            <b> Embedder atual:</b> {embedder || "auto-detect (Ollama nomic-embed-text → OpenAI → mock determinístico)"}.
            Quando uma skill (Zekrom, Mirror, Audit) precisar de contexto adicional, faz query semântica top-K aqui.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 p-3 mb-4 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Documentos</div>
          <div className="text-2xl font-bold tabular-nums">{docs.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Chunks Indexados</div>
          <div className="text-2xl font-bold tabular-nums">{totalChunks}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Embedder</div>
          <div className="text-sm font-mono mt-1 text-emerald-400">{embedder || "auto"}</div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
          drag ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/50"
        }`}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Solte arquivos aqui ou clique pra selecionar</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD, JSON, YAML — múltiplos arquivos</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.json,.yaml,.yml,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Docs list */}
      <div className="rounded-xl border bg-card mb-6">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Documentos Ingeridos</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando...</div>
        ) : docs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum documento. Faça upload acima pra começar a alimentar as skills.
          </div>
        ) : (
          <div className="divide-y">
            {docs.map((d) => (
              <div key={d.docId} className="p-4 flex items-center gap-3 hover:bg-muted/30 transition">
                <FileText className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.docName}</div>
                  <div className="text-xs text-muted-foreground">{fmtSize(d.chunkCount)} · {new Date(d.createdAt).toLocaleString("pt-BR")}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Indexado
                </span>
                <button onClick={() => removeDoc(d.docId)} className="text-muted-foreground hover:text-red-500 transition">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query playground */}
      <div className="rounded-xl border bg-card">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" /> Query Semântica · Playground
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Teste o RAG. Mesma query que as skills fazem internamente.</p>
        </div>
        <div className="p-4 space-y-3">
          <form
            onSubmit={(e) => { e.preventDefault(); runQuery() }}
            className="flex gap-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: 'política de senha BACEN', 'requisitos LGPD para PIX', 'arquitetura SIACI'"
              className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
              disabled={searching}
            />
            <button type="submit" disabled={!query.trim() || searching} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </form>

          {results.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Top {results.length} chunks por similaridade
              </div>
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border bg-background p-3">
                  <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className="font-mono bg-sky-500/15 text-sky-400 px-1.5 py-0.5 rounded">#{i + 1}</span>
                    <span className="font-semibold text-emerald-400">{r.docName}</span>
                    <span className="text-muted-foreground">chunk {r.chunkIndex}</span>
                    <span className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                      sim: {(r.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
