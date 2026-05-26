# UnisysGuard · Plataforma AppSec & ASPM

Plataforma da Unisys para a Caixa Econômica Federal — gestão de vulnerabilidades, postura de segurança, threat modeling, inteligência operacional e apoio à remediação com IA agêntica.

## Alinhamento com a prática Unisys

O UnisysGuard é construído como **framework agêntico de IA**, mesma filosofia já entregue pela Unisys em modernização de aplicações para clientes enterprise (case público NI · reconhecido pela Avasant como Innovator em Application Modernization Services).

| NI Framework (modernização) | UnisysGuard Framework (AppSec/ASPM) |
|---|---|
| Assistentes generativos automatizando processos manuais | Skills agênticas (Zekrom, Reshiram, Mewtwo, Kyogre, Articuno) |
| OpenAI Assistants + GPT-4o | Multi-provider: GitHub Models (Unisys-approved), Ollama (local), demo, externos |
| Treinado no repositório de código existente da NI | RAG sobre Base de Conhecimento Caixa (docs, regulatórios, código) |
| Plugin Eclipse developer-installable, self-service | Extensão VSCode/Copilot (roadmap) — squads instalam direto no IDE |
| Privacy & security protocols rigorosos da NI | Unisys AI P1.0 · NIST AI RMF · Provider posture (approved/local/external) |
| Isolated modernization approach | Tenant isolation + token apenas em sessão + zero data egress (Ollama) |

Ver detalhes em `/framework` na plataforma.

## Visão Geral

A plataforma centraliza:

* vulnerabilidades de múltiplas fontes (RTC, SonarQube, scanners de pipeline)
* catálogo ASPM hierárquico: Produto → Repositório → Test Run → Finding
* integrações com ferramentas de AppSec usadas na Caixa (SonarQube, OWASP ZAP, Trivy, GitLeaks, IBM RTC)
* ingestão nativa de scanners via CI/CD
* inventário de repositórios com GitLab/RTC como fonte técnica
* modelagem de ameaças por produto com base de conhecimento via RAG
* inteligência de segurança com `UnisysGuard`
* threat intel para priorização
* multi-tenant com isolamento entre empresas (Caixa, Unisys interna)
* governança operacional: SLA, ownership, MFA, licenciamento, trilhas de auditoria

Posicionada como plataforma SaaS de segurança com módulos de `AppSec`, `Threat Modeling`, `Pentest Tools` e inteligência operacional, unificando visibilidade, priorização e ação prática.

## Principais Capacidades

### 1. Dashboard ASPM

O dashboard principal entrega:

* alertas urgentes
* posture score e KPIs operacionais
* leitura executiva do `UnisysGuard`
* insights de postura e tendência
* portais operacionais do tenant
* distribuição por severidade
* distribuição e ranking OWASP 2025
* backlog, ownership, ativos mais expostos e threat intel

### 2. Vulnerabilidades

Backlog operacional com:

* listagem com severidade visual
* contexto por sistema, repositório, ferramenta e origem
* SLA calculado com base na data de identificação
* leitura detalhada da vulnerabilidade em sheet lateral
* validação contextual no código via GitLab
* evidências agrupadas por uso direto, transitivo e apenas declarado
* histórico, evidências, comentários
* enriquecimento manual com IA
* CTA para conversar com o `UnisysGuard` sobre aquela finding

### 3. Catálogo ASPM

O catálogo normaliza a visão em:

* `Produto de negócio` (ex: Caixa Internet Banking, PIX Core)
* `Repositório` (ASP.NET, COBOL)
* `Test run` (Sonar Scan, ZAP DAST)
* `Finding`

Recebe dados de SonarQube, GitLab, IBM RTC e ingestão nativa de scanners.

### 4. Integrações

* `SonarQube` — SAST (padrão Unisys/Caixa)
* `OWASP ZAP` — DAST
* `Trivy` — container/SCA
* `GitLeaks` — secrets
* `Grype` / `Govulncheck` — SCA
* `GitLab Caixa` — inventário de repositórios e contexto de código
* `IBM RTC` — épicos de pentest, único integrador de tracking
* `MobSF` — análise mobile
* Fontes de `Threat Intel`

Plataformas CI/CD com documentação e geração de pipeline:

* `GitLab CI`
* `GitHub Actions`
* `Azure DevOps`
* `Jenkins`

### 5. Inteligência com IA — UnisysGuard

`UnisysGuard` é a identidade da IA na plataforma. Atua em:

* enriquecimento de vulnerabilidades
* resumo executivo
* leitura estratégica do tenant
* apoio à remediação
* análise de evidências e geração de épicos RTC
* análise STRIDE de diagramas de arquitetura
* análise de business logic em histórico HTTP (Burp)
* filtragem de falso-positivo em JS recon (JSHunter)

A configuração de provedores (OpenAI, Anthropic, Google, Groq, Ollama local) é responsabilidade do `Global Admin`. Para o usuário final, a IA é sempre o `UnisysGuard`.

### 6. Pentest Tools (Squad Ofensiva)

Conjunto de ferramentas direcionadas à squad ofensiva Unisys:

* **Gerador de Épicos** — upload de PoC + descrição → IA gera épico RTC completo (título, descrição técnica, OWASP, impacto, mitigação, riscos)
* **Análise de Arquitetura** — upload de diagrama → IA aplica STRIDE por componente + gera árvore de ataque
* **JSHunter** — recon de JS para extrair secrets, endpoints, URLs internas, com filtro IA de falso-positivo
* **UniSystem · Burp Bridge** — import de histórico HTTP do Burp + análise de business logic (IDOR, BOLA, race conditions)

### 7. Threat Intel

Cruza findings com fontes externas (KEV, EPSS, exploit público, reputação de indicadores, contexto de CVEs/IOCs).

Fontes globais configuráveis pelo admin:

* `AlienVault OTX`
* `VirusTotal`
* `AbuseIPDB`
* `abuse.ch`
* `NVD API 2.0`

### 8. Governança Multi-tenant

* isolamento por tenant
* escopo de integração, vulnerabilidade e IA por tenant
* memória operacional por tenant
* trilhas de auditoria
* licenciamento por empresa com trial, expiração e bloqueio
* grupos estruturais por módulo + grupos de recurso criados pela empresa
* MFA opcional ou obrigatório por política

### 9. Threat Modeling

Módulo independente com:

* painel de modelagem
* produtos de threat modeling
* requisitos de segurança (OWASP ASVS/MASVS)
* base de conhecimento por tenant (RAG com docs Caixa, regulatórios BACEN/LGPD)
* análise de arquitetura e contexto com `UnisysGuard`

### 10. Observabilidade

Visões administrativas:

* logs e monitoramento do `UnisysGuard`
* consumo de tokens por conversa e provider
* histórico agrupado por chat
* chamadas de ingestão de scanners
* volume de scans por empresa
* sucesso, erro e duração das execuções
* auditoria de autenticação, rate limit e ações críticas

## Arquitetura

### Stack Principal

* `Frontend`: Next.js 16, React 19, TypeScript, TailwindCSS 4, Shadcn/UI, Radix, Recharts, @xyflow/react
* `Backend`: Node.js, Express, TypeScript, Prisma ORM
* `Banco`: PostgreSQL 15 (via Docker Compose)
* `Containerização`: Docker Compose
* `IA`: camada de orquestração do `UnisysGuard` (multi-provider: OpenAI, Anthropic, Google, Groq, Ollama)
* `Threat Intel`: fontes externas correlacionadas com CVE

### Estrutura do Repositório

```
epicvuln/
├── backend/
│   ├── src/
│   │   ├── modules/         # auth, users, vulnerabilities, llm, rtc, ...
│   │   ├── services/        # sla-scheduler, email
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/              # schema + migrations + seed
│   └── docs/
├── app/                     # Next.js App Router
│   ├── (dashboard)/
│   │   ├── produtos/
│   │   ├── repositorios/
│   │   ├── vulnerabilidades/
│   │   ├── catalogo/
│   │   ├── inteligencia/    # UnisysGuard
│   │   ├── postura/
│   │   ├── threat-modeling/
│   │   ├── pentest/         # Épicos, Arquitetura, JSHunter, UniSystem
│   │   └── admin/
│   ├── login/
│   └── onboarding/
├── components/
├── lib/
├── docker-compose.yml
└── README.md
```

### Módulos Importantes do Backend

* `auth`, `users`
* `vulnerabilities`
* `analytics`
* `imports`
* `llm` (UnisysGuard)
* `rtc` (IBM RTC)
* `reports`, `settings`, `risk`
* `notifications`, `audit`

### Áreas Importantes do Frontend

* `app/(dashboard)` — Dashboard ASPM
* `app/(dashboard)/produtos`, `repositorios`, `vulnerabilidades`, `catalogo`
* `app/(dashboard)/inteligencia` — UnisysGuard
* `app/(dashboard)/threat-modeling/*`
* `app/(dashboard)/pentest/*` — squad ofensiva
* `app/(dashboard)/admin/*` — observabilidade e governança

## Conceitos do Domínio

### Produto

Contexto de negócio que agrupa repositórios.

Exemplo:

* `Caixa Internet Banking`
* `PIX Caixa Core`
* `App Caixa Mobile`

### Repositório

Unidade técnica versionada e analisada.

Exemplo:

* `caixa-ib-frontend` (ASP.NET / C#)
* `caixa-ib-cobol-core` (COBOL)
* `pix-core-orchestrator` (ASP.NET Core)

### Test Run

Execução de uma ferramenta naquele repositório.

Exemplo:

* `SonarQube Scan`
* `OWASP ZAP DAST`
* `Trivy Container Scan`
* `IBM RTC Pentest Epic`

### Finding / Vulnerabilidade

Item detectado pela ferramenta e materializado no backlog.

## Áreas Funcionais

### AppSec

A navegação principal usa `AppSec` como área funcional:

* Dashboard ASPM
* Produtos
* Repositórios
* Vulnerabilidades
* Catálogo
* Kanban
* Squads
* UnisysGuard (Inteligência)
* Postura
* Sincronização
* Relatórios

### Threat Modeling

Módulo independente:

* Painel TM
* Produtos TM
* Requisitos
* Base de Conhecimento
* análise com `UnisysGuard`

### Pentest Tools

Ferramentas para a squad ofensiva Unisys:

* Gerador de Épicos (IA Vision)
* Análise de Arquitetura (STRIDE)
* JSHunter
* UniSystem · Burp Bridge

### Alertas

Centralização de:

* alertas de vulnerabilidades
* alertas de integrações
* sinais operacionais
* leitura rápida do `UnisysGuard`

### Configurações

* editar perfil, trocar senha, foto
* preferências, MFA pessoal
* integrações por tenant
* perfil da empresa

### Administração (Global Admin)

* empresas
* admins da plataforma
* auditoria
* logs do `UnisysGuard`
* observabilidade de scans
* integrações globais e de IA
* threat intel global

## Bootstrap Inicial

Para instalações novas, a plataforma nasce com:

* empresa principal: `Unisys`
* slug principal: `unisys`
* admin inicial: `admin@unisys.com` / `admin@123` (definido em `SEED_ADMIN_PASSWORD`)

Usuários adicionais seedados (todos com a mesma senha inicial):

* `security@unisys.com` — Analista AppSec
* `gestor@unisys.com` — Gestor de Segurança
* `squad@unisys.com` — Dev Squad
* `leitor@unisys.com` — Auditor

> Troque essas senhas no primeiro acesso. Não mantenha credenciais de bootstrap em produção.

## Como Subir Localmente

### Opção 1 — Docker Compose (recomendado)

```powershell
cd "F:\Ferramentas Claude\EpicVuln"
docker-compose up -d --build
```

URLs padrão:

* frontend: http://localhost:9000
* backend: http://localhost:9001/api
* postgres: localhost:5432 (db `vulncontrol`)

### Opção 2 — Subida manual

**Backend:**

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

**Frontend:**

```powershell
npm install
npm run dev
```

### Variáveis Importantes

**Backend (`backend/.env`):**

* `DATABASE_URL`
* `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
* `PORT`, `NODE_ENV`, `FRONTEND_URL`
* `UPLOAD_MAX_SIZE_MB`, `UPLOAD_DIR`
* `SEED_ADMIN_PASSWORD`
* chaves opcionais de provedores de IA: `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
* chaves opcionais de threat intel

**Frontend:**

* `NEXT_PUBLIC_API_URL` (opcional — detecta dinamicamente via `window.location.hostname:9001` se omitido)

## Fluxo de Integração

### IBM RTC (Pentest)

* `base_url`
* credenciais OSLC
* parser PDF de épico Unisys

### SonarQube

Configuração mínima:

* `base_url`
* `token`

A plataforma considera apenas o que é de segurança:

* `Vulnerabilities`
* `Security Hotspots`

Não materializa como vulnerabilidade qualidade de código genérica, code smells ou bugs que não sejam AppSec.

### GitLab

* `base_url`
* `token`

Usado para:

* inventariar repositórios
* validar visibilidade e status do repositório
* abrir repositório direto pela interface
* coletar contexto para remediação
* validar evidências de código em vulnerabilidades

### Ingestão Nativa de Scanners

Fluxo:

1. admin da empresa gera chave de integração
2. chave cadastrada como variável protegida no CI/CD
3. pipeline executa as ferramentas
4. resultado enviado para endpoint de ingestão
5. plataforma correlaciona produto, repositório, branch, commit e findings

Ferramentas suportadas: `Grype`, `GitLeaks`, `Trivy`, `Gosec`, `Govulncheck`, `SonarQube`, `OWASP ZAP`, `MobSF`.

## Lógica de SLA

SLA calculado com base em:

* data de identificação da vulnerabilidade
* severidade
* domínio analítico

Domínios tratados: `SAST`, `SCA`, `IaC`, `Pentest`, `Secrets`, `Container`.

Quando a política de SLA muda, a plataforma recalcula o prazo das vulnerabilidades abertas.

Cron jobs automáticos:

* `checkSlaWarnings` — diário 08:00
* `checkSlaExpired` — diário 08:30
* `checkEscalationToManager` — diário 09:00
* `checkEscalationToCLevel` — segunda 09:30
* `sendWeeklyDigest` — segunda 07:00

## Enriquecimento com IA

Cada vulnerabilidade pode passar por enriquecimento do `UnisysGuard`. Objetivo:

* melhorar legibilidade técnica
* explicar risco em linguagem clara
* sugerir remediação
* destacar impacto de negócio bancário
* usar threat intel como reforço de priorização
* consolidar evidências encontradas no GitLab
* apoiar decisão de falso positivo quando a dependência só estiver declarada
* orientar o primeiro arquivo/ponto de correção

O enriquecimento usa fingerprint para evitar custo desnecessário.

## Segurança da Plataforma

* isolamento entre tenants
* filtros tenant-scoped na API
* IA com tools escopadas ao tenant
* não exposição do provider/modelo para o usuário final
* trilhas de auditoria
* MFA com política por empresa
* rate limit de senha e MFA
* uploads persistentes fora do ciclo de vida do container

## Perfis e Governança

Papel forte de `Global Admin` (exclusivo Unisys) e grupos estruturais para empresas clientes.

Grupos estruturais:

* `Global Admin`
* `Admin da empresa`
* `AppSec`
* `Threat Modeling`
* `Pentest Tools`
* grupos de recurso criados pela empresa

Regras:

* quem não pertence a um grupo não vê módulos operacionais
* o chatbot respeita escopo de módulo e permissões

## Boas Práticas para Evolução

* não quebrar isolamento entre empresas
* evitar lógica pesada no client
* preferir cache server-side para inteligência e dashboards
* tratar `UnisysGuard` como produto, não como detalhe de provider
* manter o dashboard visualmente premium, mas com utilidade operacional real
* priorizar previsibilidade de UX sobre editores "livres"
* documentar toda nova integração com exemplo de CI/CD
* manter GitLab/RTC como fonte técnica preferencial para contexto de código
* nunca depender de dados do client para determinar escopo de tenant

## Resumo Executivo

> A plataforma **EpicVuln** unifica AppSec, Threat Modeling, ingestão nativa de scanners, catálogo ASPM, inteligência operacional com `UnisysGuard`, threat intel e ferramentas de pentest ofensivo em uma experiência SaaS multi-tenant orientada à operação real da Unisys/Caixa Econômica Federal.

## Autoria

Plataforma desenvolvida para a operação Unisys / Caixa Econômica Federal.

Repositório base: https://github.com/MTheux/EpicVuln
