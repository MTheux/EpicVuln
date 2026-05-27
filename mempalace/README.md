# MemPalace Stub para AISEC

Stub local-first inspirado em [milla-jovovich/mempalace-Aya-fork](https://github.com/milla-jovovich/mempalace-Aya-fork).

## O que faz

Camada de memória persistente verbatim pro AISEC. Cada pentester (ou projeto) tem um **wing** com **rooms** (tópicos) e **drawers** (entradas). Toda conversa do HackBot, plano do Zekrom, evidência colada ou finding pode ser armazenado e recuperado por similaridade semântica — **100% local, zero API calls externas**.

## API

`GET /health` → status do serviço

`POST /store` — guarda conteúdo verbatim
```json
{
  "content": "texto literal a guardar",
  "wing": "matheus",
  "room": "hackbot",
  "tags": ["xss", "siaci-portal"]
}
```

`POST /recall` — busca por similaridade
```json
{
  "query": "como exploro IDOR no SIACI?",
  "wing": "matheus",
  "room": "hackbot",
  "top_k": 5
}
```

`GET /wings` — lista wings + contagens

`DELETE /wing/{wing}` — apaga wing inteira

## Stack

- **FastAPI** + **uvicorn**
- **ChromaDB** persistente em `/data/chroma`
- **sentence-transformers** `all-MiniLM-L6-v2` (~80MB, pré-baixado na image)

## Compliance Unisys AI P1.0

- Zero egress: embedding e armazenamento 100% locais.
- Data residency: volume Docker fica na infra do tenant.
- Audit: cada `/store` retorna ID rastreável + timestamp.
- Sem PII de cliente final no embed (responsabilidade do AISEC backend filtrar antes de chamar).
