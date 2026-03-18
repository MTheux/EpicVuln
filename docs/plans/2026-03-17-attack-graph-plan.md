# Attack Graph Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add interactive Attack Graph feature to Intelligence page, showing real vulnerability exploitation chains per asset/squad using Gemini AI + React Flow.

**Architecture:** New backend endpoint `GET /api/llm/attack-graph` queries active vulns, groups by asset, sends to Gemini with anti-hallucination prompt, returns structured scenarios. Frontend adds tab system to Intelligence page with React Flow rendering interactive graphs + detail panel.

**Tech Stack:** React Flow (`@xyflow/react`), Gemini 2.0 Flash, Prisma, Next.js tabs

---

### Task 1: Install React Flow dependency

**Files:**
- Modify: `package.json`

**Step 1: Install @xyflow/react**

Run:
```bash
cd "C:/Users/teteu/Downloads/Project dash" && npm install @xyflow/react
```
Expected: Package added to dependencies.

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react for attack graph visualization"
```

---

### Task 2: Backend — Add `generateAttackGraph()` method to LLM service

**Files:**
- Modify: `backend/src/modules/llm/llm.service.ts`

**Step 1: Add the method after `generateAnalysis()`**

Add a separate cache for attack graph and the new method:

```typescript
private attackGraphCache: { data: any; timestamp: number } | null = null;

async generateAttackGraph() {
  // Check cache
  if (this.attackGraphCache && (Date.now() - this.attackGraphCache.timestamp) < this.CACHE_TTL) {
    console.log('Mytchi AI: Retornando attack graph do cache.');
    return { ...this.attackGraphCache.data, _cached: true, _cachedAt: new Date(this.attackGraphCache.timestamp).toISOString() };
  }

  // Query active vulns with full data for attack graph
  const vulnerabilidades = await prisma.vulnerability.findMany({
    where: {
      status: { notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] },
      criticidade: { in: ['EXTREMA', 'CRITICA', 'ALTA', 'MEDIA'] }
    },
    select: {
      codigoInterno: true,
      jiraKey: true,
      titulo: true,
      criticidade: true,
      status: true,
      squad: true,
      ativo: true,
      sistema: true,
      cwe: true,
      owaspCategory: true,
      impacto: true,
      descricaoExecutiva: true,
      recomendacao: true,
      diasEmAberto: true,
      sla: true,
      reincidencia: true,
    }
  });

  if (!process.env.GEMINI_API_KEY) {
    return { scenarios: [], error: 'GEMINI_API_KEY não configurada.' };
  }

  if (vulnerabilidades.length < 2) {
    return { scenarios: [], message: 'Menos de 2 vulnerabilidades ativas. Attack Graph requer pelo menos 2.' };
  }

  // Group by asset
  const byAsset: Record<string, typeof vulnerabilidades> = {};
  for (const v of vulnerabilidades) {
    const key = v.ativo || v.sistema || 'Sem Ativo';
    if (!byAsset[key]) byAsset[key] = [];
    byAsset[key].push(v);
  }

  // Filter only assets with 2+ vulns
  const assetsWithMultiple = Object.entries(byAsset).filter(([, vulns]) => vulns.length >= 2);

  if (assetsWithMultiple.length === 0) {
    return { scenarios: [], message: 'Nenhum ativo com 2+ vulnerabilidades para gerar cenário de ataque.' };
  }

  const vulnData = assetsWithMultiple.map(([asset, vulns]) => ({
    asset,
    squad: vulns[0].squad,
    vulnerabilities: vulns.map(v => ({
      key: v.jiraKey || v.codigoInterno,
      titulo: v.titulo,
      criticidade: v.criticidade,
      cwe: v.cwe,
      impacto: v.impacto ? v.impacto.substring(0, 300) : null,
      diasEmAberto: v.diasEmAberto,
      recomendacao: v.recomendacao ? v.recomendacao.substring(0, 200) : null,
    }))
  }));

  const systemPrompt = `Voce e a "Mytchi AI", CISO virtual da CredSystem (instituicao financeira).

REGRAS ABSOLUTAS - QUEBRE QUALQUER UMA E O OUTPUT SERA REJEITADO:
1. Use APENAS as vulnerabilidades listadas abaixo. NAO invente CVEs, CWEs, falhas ou codigos.
2. Cada no do grafo com tipo "entry" ou "exploit" DEVE referenciar um codigo real da lista (ex: VUL-394).
3. O impacto final (no tipo "impact") DEVE ser EXATAMENTE uma destas categorias:
   "Fraude Financeira", "Multa LGPD/Regulatoria", "Indisponibilidade de Servico", "Dano Reputacional"
4. NAO invente cenarios que nao podem ser logicamente derivados das vulnerabilidades fornecidas.
5. Cada cenario deve ter entre 2 e 6 nos (entry/exploit) mais 1 no de impact.
6. As edges devem explicar em 1 frase curta COMO a exploracao de um no leva ao proximo.

VULNERABILIDADES REAIS DO AMBIENTE CREDSYSTEM:
${JSON.stringify(vulnData, null, 2)}

TAREFA: Para cada ativo que tenha 2+ vulns, gere UM cenario de ataque mostrando como as vulns podem ser ENCADEADAS para causar dano financeiro/regulatorio a CredSystem.

Formato JSON EXATO (devolva APENAS o JSON puro, sem markdown):
{
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "Nome descritivo do cenario de ataque",
      "asset": "Nome do ativo (exatamente como na lista)",
      "squad": "Nome da squad responsavel",
      "riskLevel": "CRITICO|ALTO|MEDIO",
      "impactCategory": "Uma das 4 categorias fixas",
      "description": "Resumo executivo do cenario em 2 linhas max",
      "nodes": [
        { "id": "n1", "vulnKey": "VUL-XXX", "label": "Titulo curto da vuln", "type": "entry", "criticidade": "EXTREMA" },
        { "id": "n2", "vulnKey": "VUL-YYY", "label": "Titulo curto", "type": "exploit", "criticidade": "ALTA" },
        { "id": "n3", "vulnKey": null, "label": "Categoria de Impacto", "type": "impact", "criticidade": null }
      ],
      "edges": [
        { "source": "n1", "target": "n2", "label": "Como A leva a B" },
        { "source": "n2", "target": "n3", "label": "Como B causa o impacto" }
      ],
      "recommendation": "Acao corretiva especifica referenciando os codigos das vulns"
    }
  ]
}`;

  try {
    console.log("Mytchi AI: Gerando Attack Graph com modelo gemini-2.0-flash...");
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(text);
    this.attackGraphCache = { data: parsed, timestamp: Date.now() };
    return { ...parsed, _cached: false };
  } catch (e: any) {
    console.error("Gemini Attack Graph Error:", e.message);
    if (this.attackGraphCache) {
      return { ...this.attackGraphCache.data, _cached: true, _stale: true, _error: e.message };
    }
    return { scenarios: [], error: 'Erro ao gerar Attack Graph: ' + e.message };
  }
}
```

**Step 2: Commit**

```bash
cd backend && git add src/modules/llm/llm.service.ts
git commit -m "feat: add generateAttackGraph method to LLM service"
```

---

### Task 3: Backend — Add route and controller for attack-graph endpoint

**Files:**
- Modify: `backend/src/modules/llm/llm.controller.ts`
- Modify: `backend/src/modules/llm/llm.routes.ts`

**Step 1: Add controller method in `llm.controller.ts`**

Add after `analyzeVulnerabilities`:

```typescript
getAttackGraph = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await this.llmService.generateAttackGraph();
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Attack Graph Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar Attack Graph',
      error: error.message
    });
  }
};
```

**Step 2: Add route in `llm.routes.ts`**

Add after the analyze route:

```typescript
router.get('/attack-graph', llmLimiter, llmController.getAttackGraph);
```

**Step 3: Commit**

```bash
git add src/modules/llm/llm.controller.ts src/modules/llm/llm.routes.ts
git commit -m "feat: add GET /api/llm/attack-graph endpoint"
```

---

### Task 4: Frontend — Refactor Intelligence page with tabs

**Files:**
- Modify: `app/(dashboard)/inteligencia/page.tsx`

**Step 1: Add tab UI**

Wrap the existing content in a tab called "Analise Executiva" and create a second tab "Attack Graph". Use simple state-based tabs (no extra dependency needed since we already have radix tabs).

The existing page content (stats, AI cards, charts) goes into tab 1.
Tab 2 will be built in the next task.

Add at the top of the component:
```typescript
const [activeTab, setActiveTab] = useState<'executive' | 'attackGraph'>('executive')
```

Add tab buttons after the header, before the stats grid:
```tsx
<div className="mb-6 flex gap-2 border-b border-border">
  <button
    onClick={() => setActiveTab('executive')}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === 'executive'
        ? 'border-purple-500 text-purple-500'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`}
  >
    <Brain className="inline-block h-4 w-4 mr-2" />
    Analise Executiva
  </button>
  <button
    onClick={() => setActiveTab('attackGraph')}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === 'attackGraph'
        ? 'border-purple-500 text-purple-500'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`}
  >
    <Target className="inline-block h-4 w-4 mr-2" />
    Attack Graph
  </button>
</div>
```

Wrap existing content in `{activeTab === 'executive' && ( ... )}`.
Add placeholder for attack graph: `{activeTab === 'attackGraph' && ( <div>Attack Graph tab</div> )}`.

**Step 2: Commit**

```bash
git add app/(dashboard)/inteligencia/page.tsx
git commit -m "feat: add tab navigation to intelligence page"
```

---

### Task 5: Frontend — Build Attack Graph tab with React Flow

**Files:**
- Create: `app/(dashboard)/inteligencia/attack-graph-tab.tsx`

**Step 1: Create the Attack Graph tab component**

This component:
1. Fetches `GET /api/llm/attack-graph` on mount
2. Renders each scenario as a Card with an embedded React Flow graph
3. Custom nodes colored by criticidade
4. Custom edges with labels
5. Filters by squad and criticidade
6. Side panel on node click with vuln details

The component should:
- Import `ReactFlow, MiniMap, Controls, Background` from `@xyflow/react`
- Import `@xyflow/react/dist/style.css`
- Define custom node types: `entryNode`, `exploitNode`, `impactNode`
- Convert each scenario's nodes/edges to React Flow format
- Position nodes automatically in a left-to-right layout
- Handle node click to show detail panel

Key interfaces:
```typescript
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

interface ScenarioNode {
  id: string
  vulnKey: string | null
  label: string
  type: 'entry' | 'exploit' | 'impact'
  criticidade: string | null
}

interface ScenarioEdge {
  source: string
  target: string
  label: string
}
```

Custom node component renders:
- Colored border based on criticidade (EXTREMA=red, CRITICA=orange, ALTA=yellow, MEDIA=blue)
- Icon based on type (entry=shield, exploit=alert, impact=category icon)
- VulnKey badge at top
- Label text
- Click handler to open side panel

Side panel shows:
- vulnKey (link to Jira if available)
- Full title
- Criticidade badge
- Days open
- Squad
- SLA status
- Description excerpt
- Recommendation

Filters at top:
- Squad dropdown (populated from scenarios data)
- Criticidade dropdown
- Refresh button

**Step 2: Commit**

```bash
git add app/(dashboard)/inteligencia/attack-graph-tab.tsx
git commit -m "feat: create AttackGraphTab component with React Flow"
```

---

### Task 6: Frontend — Integrate Attack Graph tab into Intelligence page

**Files:**
- Modify: `app/(dashboard)/inteligencia/page.tsx`

**Step 1: Import and render AttackGraphTab**

```typescript
import AttackGraphTab from './attack-graph-tab'
```

Replace the placeholder `<div>Attack Graph tab</div>` with:
```tsx
{activeTab === 'attackGraph' && <AttackGraphTab />}
```

**Step 2: Commit**

```bash
git add app/(dashboard)/inteligencia/page.tsx
git commit -m "feat: integrate AttackGraphTab into intelligence page"
```

---

### Task 7: Fix Jira import — use Jira dates and full descriptions

**Files:**
- Modify: `backend/src/modules/vulnerabilities/vulnerabilities.service.ts`

**Step 1: Fix the `importJiraJson` method**

In the mapping inside `importJiraJson`, ensure:
- `dataCriacao` uses `item.dataCriacao` from Jira (not `new Date()`)
- `dataDeteccao` uses `item.dataDeteccao` from Jira
- `ultimaAtualizacao` uses `item.atualizadoEm` from Jira
- `descricaoExecutiva` maps from `item.resumo` (summary)
- `descricaoTecnica` maps from `item.descricao` (full description, not truncated)
- `impacto` maps from `item.impacto`
- `recomendacao` maps from `item.recomendacao`
- `sla` maps from `item.dataLimite`
- `diasEmAberto` is calculated from `item.dataCriacao` (Jira date), not from import date

**Step 2: Commit**

```bash
git add src/modules/vulnerabilities/vulnerabilities.service.ts
git commit -m "fix: use Jira dates and full descriptions in import mapping"
```

---

### Task 8: Test end-to-end

**Step 1: Start backend**

```bash
cd "C:/Users/teteu/Downloads/Project dash/backend" && npm run dev
```

**Step 2: Start frontend**

```bash
cd "C:/Users/teteu/Downloads/Project dash" && npm run dev
```

**Step 3: Verify**

1. Login as admin@credsystem.com / Admin@123
2. Go to Inteligencia page — verify tabs appear
3. Click "Attack Graph" tab — verify loading, then graph renders
4. Click a node — verify side panel opens with vuln details
5. Test filters (squad, criticidade)
6. Test drag, zoom, minimap
7. Go to Notificacoes — verify no more `regras.map` error
8. Re-import Jira JSON — verify dates and descriptions are correct

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Attack Graph with React Flow + fix Jira import dates"
```
