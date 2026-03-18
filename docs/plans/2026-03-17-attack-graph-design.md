# Attack Graph — Cenários de Exploração por Ativo

**Data**: 2026-03-17
**Status**: Aprovado

## Decisões

- **Visual**: Grafo interativo com React Flow (`@xyflow/react`)
- **Motor**: 100% Gemini AI, anti-alucinação (só dados reais das vulns importadas)
- **Escopo**: Múltiplos cenários agrupados por ativo/squad
- **Impacto**: 4 categorias fixas — Fraude Financeira, Multa LGPD/Regulatória, Indisponibilidade de Serviço, Dano Reputacional
- **Local**: Tab "Attack Graph" dentro da página de Inteligência (ao lado da tab "Análise Executiva")
- **Interação**: Drag, zoom, minimap, filtros por squad/criticidade + painel lateral com detalhes da vuln ao clicar

## Arquitetura

```
[Frontend - Tab Attack Graph]
    │
    ├── GET /api/llm/attack-graph
    │       ├── Busca vulns ativas (EXTREMA, CRITICA, ALTA, MEDIA)
    │       ├── Agrupa por ativo
    │       ├── Prompt Gemini com vulns reais + categorias fixas
    │       ├── Cache 30min (mesmo padrão do /analyze)
    │       └── Retorna array de cenários
    │
    └── React Flow renderiza os grafos interativos
```

## Backend — Endpoint `GET /api/llm/attack-graph`

### Query
Busca vulns com status aberto (exclui CONCLUIDO, FECHADO, MITIGADO, RISCO_ACEITO), criticidade EXTREMA/CRITICA/ALTA/MEDIA, agrupadas por `ativo`.

### Prompt Gemini (anti-alucinação)
- REGRA: Usar APENAS vulns listadas, nunca inventar CVEs/CWEs
- Cada nó referencia código real (ex: VUL-394)
- Impacto final deve ser uma das 4 categorias fixas
- Gera cenário apenas para ativos com 2+ vulns

### Formato de resposta JSON
```json
{
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "Ataque ao Portal SSO",
      "asset": "Portal SSO",
      "squad": "Portal Credsystem",
      "riskLevel": "CRITICO",
      "impactCategory": "Fraude Financeira",
      "description": "Resumo executivo (2 linhas)",
      "nodes": [
        { "id": "n1", "vulnKey": "VUL-394", "label": "IDOR no SSO", "type": "entry", "criticidade": "EXTREMA" },
        { "id": "n2", "vulnKey": "VUL-396", "label": "Bypass Instalador", "type": "exploit", "criticidade": "ALTA" },
        { "id": "n3", "vulnKey": null, "label": "Fraude Financeira", "type": "impact", "criticidade": null }
      ],
      "edges": [
        { "source": "n1", "target": "n2", "label": "Atacante acessa outro estabelecimento" },
        { "source": "n2", "target": "n3", "label": "Executa operações no contexto da vítima" }
      ],
      "recommendation": "Corrigir VUL-394 e VUL-396 para quebrar a cadeia"
    }
  ]
}
```

## Frontend — Tab "Attack Graph"

### Layout
- Filtros no topo: Squad, Criticidade, botão Atualizar
- Cards por cenário com título, risco, impacto, squad
- Grafo React Flow dentro de cada card
- Painel lateral ao clicar em um nó

### Nós customizados
- **Entry** (borda verde): Ponto de entrada do atacante
- **Exploit** (borda laranja/vermelha): Vuln explorada na cadeia
- **Impact** (fundo roxo): Dano final com ícone da categoria

### Cores por criticidade
- EXTREMA: vermelho
- CRITICA: laranja
- ALTA: amarelo
- MEDIA: azul

### Painel lateral (clique no nó)
- Código Jira (link clicável)
- Título completo
- Criticidade (badge colorido)
- Dias em aberto
- Squad responsável
- Status do SLA
- Descrição resumida
- Recomendação

## Categorias de Impacto Fixas

| Categoria | Contexto |
|-----------|----------|
| Fraude Financeira | Transações não autorizadas, account takeover |
| Multa LGPD/Regulatória | Vazamento de dados, não conformidade BCB |
| Indisponibilidade de Serviço | DoS, degradação de performance |
| Dano Reputacional | Exposição pública, perda de confiança |

## Cache e Performance
- Cache 30min com fallback stale (mesmo padrão do /analyze)
- Endpoint separado para não invalidar cache da análise executiva
- Filtros aplicados no frontend (sem nova chamada à IA)

## Dependências
- `@xyflow/react` — biblioteca de grafos interativos
