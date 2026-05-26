"use client"

import { useEffect, useState } from "react"
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings2,
  Send,
  Trash2,
  Code2,
  Workflow,
  MessageSquare,
  Webhook,
  Cloud,
  Network,
  Download,
  Copy,
  Hash,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { authHeaders } from "@/lib/auth"

type IntegrationId = "jira" | "teams" | "slack" | "webhook" | "azure-devops" | "mcp"

interface Integration {
  id: IntegrationId
  name: string
  description: string
  icon: any
  category: "tracker" | "notification" | "webhook" | "agent"
  fields: Array<{ name: string; label: string; type: "text" | "password" | "url" | "select"; placeholder?: string; options?: string[]; required?: boolean; hint?: string }>
  docsHint?: string
}

const integrations: Integration[] = [
  {
    id: "jira",
    name: "Jira",
    description: "Cria issues automaticamente quando vuln crítica é detectada. Suporta Jira Cloud e Server.",
    icon: Hash,
    category: "tracker",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url", placeholder: "https://caixa.atlassian.net", required: true },
      { name: "email", label: "E-mail (Jira Cloud)", type: "text", placeholder: "user@caixa.gov.br" },
      { name: "token", label: "API Token", type: "password", placeholder: "ATATT...", required: true, hint: "Cloud: id.atlassian.com/manage-profile/security/api-tokens" },
      { name: "projectKey", label: "Project Key", type: "text", placeholder: "SECAPP" },
      { name: "issueType", label: "Issue Type", type: "select", options: ["Bug", "Task", "Story", "Epic"] },
    ],
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    description: "Notifica canal Teams quando finding crítico, mudança de SLA ou skill IA executada.",
    icon: MessageSquare,
    category: "notification",
    fields: [
      { name: "webhookUrl", label: "Incoming Webhook URL", type: "password", placeholder: "https://outlook.office.com/webhook/...", required: true, hint: "Teams → Canal → Conectores → Incoming Webhook" },
      { name: "channelName", label: "Nome do Canal", type: "text", placeholder: "SecOps Caixa" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Notifica canal Slack via Incoming Webhook.",
    icon: MessageSquare,
    category: "notification",
    fields: [
      { name: "webhookUrl", label: "Webhook URL", type: "password", placeholder: "https://hooks.slack.com/services/...", required: true, hint: "api.slack.com/messaging/webhooks" },
      { name: "channelName", label: "Canal", type: "text", placeholder: "#secops-caixa" },
    ],
  },
  {
    id: "webhook",
    name: "Webhook Outbound",
    description: "POST genérico de eventos pra URL custom. Útil pra integrar com SIEM, automação ou SOAR.",
    icon: Webhook,
    category: "webhook",
    fields: [
      { name: "url", label: "URL alvo", type: "url", placeholder: "https://soar.caixa.gov.br/hooks/unisysguard", required: true },
      { name: "secret", label: "Secret HMAC (opcional)", type: "password", placeholder: "shared-secret", hint: "Usado pra assinar header X-AISEC-Signature (HMAC-SHA256)" },
      { name: "events", label: "Eventos", type: "select", options: ["all", "critical-only", "sla-breach", "ai-completion"] },
    ],
  },
  {
    id: "azure-devops",
    name: "Azure DevOps",
    description: "Cria Work Items, sincroniza Boards e integra com pipelines Azure.",
    icon: Cloud,
    category: "tracker",
    fields: [
      { name: "org", label: "Organization", type: "text", placeholder: "caixa-corp", required: true },
      { name: "project", label: "Project", type: "text", placeholder: "SIACI" },
      { name: "pat", label: "Personal Access Token", type: "password", placeholder: "PAT scope: Work Items + Code", required: true, hint: "dev.azure.com/{org}/_usersSettings/tokens" },
      { name: "workItemType", label: "Tipo padrão", type: "select", options: ["Bug", "Task", "User Story", "Epic"] },
    ],
  },
  {
    id: "mcp",
    name: "MCP Server",
    description: "Expõe skills AISEC (Zekrom, Épicos, Arquitetura, JWT Inspector) como tools MCP — consumível por Claude Desktop, Cursor, agentes custom.",
    icon: Network,
    category: "agent",
    fields: [
      { name: "endpoint", label: "Endpoint público", type: "text", placeholder: "/api/mcp/tools (somente leitura, expõe metadados)" },
      { name: "requireAuth", label: "Exigir auth", type: "select", options: ["sim", "não"] },
    ],
    docsHint: "Server interno. Cole o endpoint no Claude Desktop em mcp_servers.json ou no Cursor settings.",
  },
]

const categoryLabel: Record<string, string> = {
  tracker: "Tracker (Jira / Azure)",
  notification: "Notificação (Teams / Slack)",
  webhook: "Webhook genérico",
  agent: "Agentes IA",
}

const categoryColor: Record<string, string> = {
  tracker: "text-violet-400 bg-violet-500/15 border-violet-500/30",
  notification: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  webhook: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  agent: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
}

const apiUrl = () =>
  typeof window === "undefined"
    ? "http://localhost:9001"
    : process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:9001`

export default function IntegracoesPage() {
  const [state, setState] = useState<Record<IntegrationId, { enabled: boolean; config: Record<string, any> }>>({} as any)
  const [openCfg, setOpenCfg] = useState<IntegrationId | null>(null)
  const [tempConfig, setTempConfig] = useState<Record<string, any>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs?: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [cicdOpen, setCicdOpen] = useState(false)

  useEffect(() => {
    fetch(`${apiUrl()}/api/integrations`, { headers: authHeaders(), credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        const next: any = {}
        list.forEach((i) => { next[i.id] = { enabled: i.enabled, config: i.config } })
        setState(next)
      })
      .catch(() => {})
  }, [])

  const openConfig = (id: IntegrationId) => {
    setOpenCfg(id)
    setTempConfig(state[id]?.config || {})
    setTestResult(null)
  }

  const save = async () => {
    if (!openCfg) return
    setSaving(true)
    try {
      const r = await fetch(`${apiUrl()}/api/integrations/${openCfg}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ enabled: true, config: tempConfig }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || "Falha")
      setState((p) => ({ ...p, [openCfg]: { enabled: true, config: tempConfig } }))
      setOpenCfg(null)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!openCfg) return
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch(`${apiUrl()}/api/integrations/${openCfg}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ config: tempConfig }),
      })
      const data = await r.json()
      setTestResult(data)
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  const remove = async () => {
    if (!openCfg) return
    if (!confirm("Remover integração?")) return
    await fetch(`${apiUrl()}/api/integrations/${openCfg}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    })
    setState((p) => {
      const n = { ...p }
      delete n[openCfg]
      return n
    })
    setOpenCfg(null)
  }

  const grouped = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i)
    return acc
  }, {})

  const current = openCfg ? integrations.find((i) => i.id === openCfg) : null

  return (
    <div>
      <PageHeader
        icon={Plug}
        title="Hub de Integrações"
        subtitle="Conecte trackers, notificações, webhooks e agentes IA"
        description="6 integrações disponíveis. Configure em segundos, teste a conexão, e o AISEC começa a propagar eventos automaticamente. Para CI/CD use o gerador de pipeline abaixo."
        actions={
          <button onClick={() => setCicdOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition">
            <Workflow className="h-4 w-4" /> Gerar Pipeline CI/CD
          </button>
        }
      />

      <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 mb-4 flex items-start gap-2 text-xs">
        <Plug className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-sky-200/80 leading-relaxed">
          <b className="text-sky-300">Conexões reais funcionam:</b> O botão "Testar" de cada card faz request real à API (Jira <code className="font-mono text-[10px] bg-background/50 px-1 rounded">/rest/api/3/myself</code>, Teams/Slack webhook POST, Azure DevOps <code className="font-mono text-[10px] bg-background/50 px-1 rounded">/_apis/projects</code>). Cole credenciais válidas pra ver o status real. <b>MCP</b> funciona sem credencial (servidor interno em <code className="font-mono text-[10px] bg-background/50 px-1 rounded">/api/mcp/tools</code>).
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground mb-3">{categoryLabel[cat]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((i) => {
              const s = state[i.id]
              const configured = s?.enabled
              return (
                <div key={i.id} className={`rounded-xl border p-5 transition hover:shadow-md ${configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${categoryColor[cat]}`}>
                      <i.icon className="h-5 w-5" />
                    </div>
                    {configured ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Configurado
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border bg-slate-500/10 text-slate-400 border-slate-500/20">
                        Não configurado
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{i.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{i.description}</p>
                  <button onClick={() => openConfig(i.id)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border bg-background hover:bg-muted text-xs font-semibold transition">
                    <Settings2 className="h-3.5 w-3.5" />
                    {configured ? "Editar" : "Configurar"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Config dialog */}
      {openCfg && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpenCfg(null)}>
          <div className="bg-card border rounded-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b sticky top-0 bg-card z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${categoryColor[current.category]}`}>
                    <current.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{current.name}</h3>
                    <p className="text-xs text-muted-foreground">{categoryLabel[current.category]}</p>
                  </div>
                </div>
                <button onClick={() => setOpenCfg(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {current.fields.map((f) => (
                <div key={f.name}>
                  <label className="text-xs font-semibold mb-1 flex items-center justify-between">
                    <span>{f.label}{f.required && <span className="text-red-500 ml-1">*</span>}</span>
                  </label>
                  {f.type === "select" ? (
                    <select
                      value={tempConfig[f.name] || ""}
                      onChange={(e) => setTempConfig((p) => ({ ...p, [f.name]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="">— escolher —</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={tempConfig[f.name] || ""}
                      onChange={(e) => setTempConfig((p) => ({ ...p, [f.name]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono"
                    />
                  )}
                  {f.hint && <p className="text-[10px] text-muted-foreground mt-1">{f.hint}</p>}
                </div>
              ))}

              {current.docsHint && (
                <div className="text-xs rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 p-3">
                  ℹ {current.docsHint}
                </div>
              )}

              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${testResult.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                  <div>
                    <div className="font-semibold">{testResult.ok ? "Conexão OK" : "Falha na conexão"}</div>
                    <div className="opacity-90 mt-0.5">{testResult.message}</div>
                    {testResult.latencyMs != null && <div className="opacity-60 text-[10px] mt-1">{testResult.latencyMs}ms</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t flex items-center justify-between sticky bottom-0 bg-card">
              <button onClick={remove} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                <Trash2 className="h-3 w-3" /> Remover
              </button>
              <div className="flex gap-2">
                <button onClick={testConnection} disabled={testing} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50">
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Testar
                </button>
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CicdGenerator open={cicdOpen} onClose={() => setCicdOpen(false)} />
    </div>
  )
}

// =================== CI/CD Pipeline Generator ===================

const CICD_PROVIDERS = [
  { id: "github", name: "GitHub Actions", file: ".github/workflows/security.yml" },
  { id: "gitlab", name: "GitLab CI", file: ".gitlab-ci.yml" },
  { id: "azure", name: "Azure DevOps", file: "azure-pipelines.yml" },
  { id: "jenkins", name: "Jenkins", file: "Jenkinsfile" },
]

const SCANNERS = [
  { id: "trivy", name: "Trivy (Container/SCA)" },
  { id: "gitleaks", name: "GitLeaks (Secrets)" },
  { id: "sonarqube", name: "SonarQube (SAST)" },
  { id: "owasp-zap", name: "OWASP ZAP (DAST)" },
  { id: "grype", name: "Grype (SCA)" },
]

function CicdGenerator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState("github")
  const [scanners, setScanners] = useState<string[]>(["trivy", "gitleaks", "sonarqube"])
  const [endpoint, setEndpoint] = useState("https://unisysguard.caixa.gov.br/api/imports/ingest")

  if (!open) return null

  const toggle = (id: string) =>
    setScanners((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const yaml = generateYaml(provider, scanners, endpoint)
  const target = CICD_PROVIDERS.find((p) => p.id === provider)!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Workflow className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold">Gerador de Pipeline CI/CD</h3>
              <p className="text-xs text-muted-foreground">Gera YAML pra rodar scanners no pipeline e enviar findings ao AISEC.</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold mb-2 block">Plataforma CI/CD</label>
            <div className="grid grid-cols-4 gap-2">
              {CICD_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${provider === p.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "bg-background hover:bg-muted"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-2 block">Scanners</label>
            <div className="grid grid-cols-2 gap-2">
              {SCANNERS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted cursor-pointer">
                  <input type="checkbox" checked={scanners.includes(s.id)} onChange={() => toggle(s.id)} className="accent-emerald-500" />
                  <span className="text-xs">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block">Endpoint ingestão AISEC</label>
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-xs font-mono" />
          </div>

          <div className="rounded-lg border bg-background overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{target.file}</span>
              <div className="flex gap-1">
                <button onClick={() => navigator.clipboard.writeText(yaml)} className="p-1 rounded hover:bg-muted" title="Copiar">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([yaml], { type: "text/yaml" })
                    const a = document.createElement("a")
                    a.href = URL.createObjectURL(blob)
                    a.download = target.file.split("/").pop() || "pipeline.yml"
                    a.click()
                  }}
                  className="p-1 rounded hover:bg-muted"
                  title="Baixar"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <pre className="p-3 text-[11px] font-mono overflow-x-auto whitespace-pre max-h-[300px]">{yaml}</pre>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border text-sm">Fechar</button>
        </div>
      </div>
    </div>
  )
}

function generateYaml(provider: string, scanners: string[], endpoint: string): string {
  const steps = scanners.map((s) => SCANNER_STEPS[s]).filter(Boolean)
  const sendStep = `    - name: Send results to AISEC\n      run: |\n        for f in scan-results/*.json; do\n          curl -X POST "${endpoint}" \\\n            -H "Authorization: Bearer \${UNISYSGUARD_TOKEN}" \\\n            -H "Content-Type: application/json" \\\n            --data-binary @"$f"\n        done`
  if (provider === "github") {
    return `# Generated by AISEC\nname: Security Scan\non: [push, pull_request]\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/checkout@v4\n${steps.join("\n")}\n${sendStep}\n    env:\n      UNISYSGUARD_TOKEN: \${{ secrets.UNISYSGUARD_TOKEN }}`
  }
  if (provider === "gitlab") {
    return `# Generated by AISEC\nstages: [security]\nsecurity-scan:\n  stage: security\n  image: ubuntu:22.04\n  script:\n${steps.map((s) => s.replace(/^    - name:.*\n      run: \|\n        /, "    - ").replace(/\n        /g, "\n    ")).join("\n")}\n${sendStep.replace(/^    - name:.*\n      run: \|\n        /, "    - ").replace(/\n        /g, "\n    ")}\n  variables:\n    UNISYSGUARD_TOKEN: $UNISYSGUARD_TOKEN`
  }
  if (provider === "azure") {
    return `# Generated by AISEC\ntrigger: [main]\npool:\n  vmImage: ubuntu-latest\nsteps:\n${steps.map((s) => "- script: |\n    " + s.split("\n        ")[1]?.replace(/\n/g, "\n    ")).join("\n")}\n- script: |\n    for f in scan-results/*.json; do\n      curl -X POST "${endpoint}" -H "Authorization: Bearer $(UNISYSGUARD_TOKEN)" -H "Content-Type: application/json" --data-binary @"$f"\n    done`
  }
  // jenkins
  return `// Generated by AISEC\npipeline {\n  agent any\n  environment { UNISYSGUARD_TOKEN = credentials('unisysguard-token') }\n  stages {\n    stage('Security') {\n      steps {\n${scanners.map((s) => `        sh '${SCANNER_CMD[s] || s}'`).join("\n")}\n        sh '''\n          for f in scan-results/*.json; do\n            curl -X POST "${endpoint}" -H "Authorization: Bearer $UNISYSGUARD_TOKEN" -H "Content-Type: application/json" --data-binary @"$f"\n          done\n        '''\n      }\n    }\n  }\n}`
}

const SCANNER_CMD: Record<string, string> = {
  trivy: "trivy fs --format json -o scan-results/trivy.json .",
  gitleaks: "gitleaks detect --report-format json --report-path scan-results/gitleaks.json .",
  sonarqube: "sonar-scanner -Dsonar.projectKey=$PROJECT -Dsonar.host.url=$SONAR_URL -Dsonar.token=$SONAR_TOKEN",
  "owasp-zap": "zap-baseline.py -t $TARGET_URL -J scan-results/zap.json",
  grype: "grype dir:. -o json > scan-results/grype.json",
}

const SCANNER_STEPS: Record<string, string> = {
  trivy: `    - name: Trivy scan\n      uses: aquasecurity/trivy-action@master\n      with:\n        scan-type: 'fs'\n        format: 'json'\n        output: 'scan-results/trivy.json'`,
  gitleaks: `    - name: GitLeaks\n      uses: gitleaks/gitleaks-action@v2\n      env:\n        GITLEAKS_LICENSE: \${{ secrets.GITLEAKS_LICENSE }}`,
  sonarqube: `    - name: SonarQube\n      uses: SonarSource/sonarqube-scan-action@master\n      env:\n        SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}\n        SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}`,
  "owasp-zap": `    - name: OWASP ZAP Baseline\n      uses: zaproxy/action-baseline@v0.10.0\n      with:\n        target: \${{ secrets.TARGET_URL }}`,
  grype: `    - name: Grype\n      uses: anchore/scan-action@v3\n      with:\n        path: '.'\n        output-format: json`,
}
