# Bloco 2: Auth Real + Cache IA + Rate Limiting

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir auth fake por login real com JWT, aplicar RBAC nos endpoints, adicionar cache no Gemini (resolve erro 429), e ativar rate limiting.

**Architecture:** Login frontend chama POST /api/auth/login, recebe JWT, armazena em cookie httpOnly. Next.js middleware valida cookie JWT. Todas as chamadas API enviam Bearer token. Backend aplica authenticate + requireRoles nas rotas. LLM service ganha cache em memória de 30min. Express-rate-limit ativado globalmente + limites específicos.

**Tech Stack:** jsonwebtoken, bcryptjs, express-rate-limit (todos já instalados), Next.js middleware, cookies

---

## Task 1: Atualizar seed com mais usuários de teste

**Files:**
- Modify: `backend/prisma/seed.ts`

Atualizar o seed para criar usuários de cada perfil para teste:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);

  const users = [
    { email: 'admin@credsystem.com', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'security@credsystem.com', name: 'Analista AppSec', role: 'SEGURANCA' as const },
    { email: 'gestor@credsystem.com', name: 'Gestor de Segurança', role: 'GESTOR' as const },
    { email: 'squad@credsystem.com', name: 'Dev Squad Backend', role: 'SQUAD' as const },
    { email: 'leitor@credsystem.com', name: 'Auditor Externo', role: 'LEITURA' as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hash, active: true },
    });
    console.log(`✅ ${u.role}: ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Todos com senha `Admin@123`.

---

## Task 2: Rate limiting no Express

**Files:**
- Modify: `backend/src/app.ts`

Adicionar rate limiting usando express-rate-limit (já instalado):

```typescript
import rateLimit from 'express-rate-limit';

// Global: 100 req/min
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Auth: 5 tentativas/min
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in 1 minute.' },
});

// LLM: 10 req/min
const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'AI analysis rate limit exceeded. Try again shortly.' },
});
```

Aplicar:
- `app.use(globalLimiter)` antes das rotas
- Exportar `authLimiter` e `llmLimiter` para uso nos módulos de rotas
- Ou aplicar diretamente no app.ts antes de montar as rotas específicas

---

## Task 3: Cache no serviço de IA (LLM)

**Files:**
- Modify: `backend/src/modules/llm/llm.service.ts`
- Modify: `backend/src/modules/llm/llm.controller.ts`

Adicionar cache em memória no LlmService:

```typescript
private cache: { data: any; timestamp: number } | null = null;
private CACHE_TTL = 30 * 60 * 1000; // 30 minutos

async generateAnalysis() {
  // Retorna cache se válido
  if (this.cache && (Date.now() - this.cache.timestamp) < this.CACHE_TTL) {
    console.log('Mytchi AI: Retornando resultado do cache.');
    return { ...this.cache.data, _cached: true, _cachedAt: new Date(this.cache.timestamp).toISOString() };
  }

  // ... chamada ao Gemini existente ...

  // Em caso de sucesso, salvar no cache
  this.cache = { data: parsed, timestamp: Date.now() };
  return { ...parsed, _cached: false };

  // Em caso de erro, retornar cache antigo se existir (fallback gracioso)
  catch (e) {
    if (this.cache) {
      return { ...this.cache.data, _cached: true, _stale: true };
    }
    // ... erro original ...
  }
}
```

Atualizar controller para passar `{ cached, cachedAt }` na resposta.

---

## Task 4: Auth real no login frontend

**Files:**
- Modify: `app/login/page.tsx`

Trocar o setTimeout fake por chamada real:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9001'
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'Login failed')

    // Salvar token em cookie httpOnly-like (via JS por enquanto)
    document.cookie = `vulncontrol_token=${data.token}; path=/; max-age=86400; SameSite=Lax`
    // Salvar user info para o frontend usar
    localStorage.setItem('vulncontrol_user', JSON.stringify(data.user))

    toast.success("Login aprovado", { description: `Bem-vindo, ${data.user.name}` })
    router.push("/")
    router.refresh()
  } catch (err: any) {
    toast.error("Acesso Negado", { description: err.message })
  } finally {
    setIsLoading(false)
  }
}
```

---

## Task 5: Middleware Next.js com token JWT

**Files:**
- Modify: `middleware.ts`

Atualizar para verificar o cookie `vulncontrol_token` em vez do `vulncontrol_auth`:

```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('vulncontrol_token')?.value
  const isAuth = !!token

  if (!isAuth && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuth && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}
```

---

## Task 6: Frontend envia Bearer token em todas as chamadas API

**Files:**
- Modify: `lib/vuln-store.ts`
- Modify: `app/(dashboard)/notificacoes/page.tsx`
- Modify: `app/(dashboard)/inteligencia/page.tsx`
- Modify: `app/(dashboard)/integracoes/page.tsx`

Criar helper para extrair token do cookie:

```typescript
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/vulncontrol_token=([^;]+)/)
  return match ? match[1] : null
}

function authHeaders(): HeadersInit {
  const token = getAuthToken()
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}
```

Adicionar esse helper no `lib/vuln-store.ts` e atualizar todos os `fetch()` para incluir `headers: authHeaders()`.

Nas páginas do dashboard, fazer o mesmo padrão nos fetches.

---

## Task 7: Remover mockAuth e aplicar auth real + RBAC nas rotas backend

**Files:**
- Modify: `backend/src/modules/vulnerabilities/vulnerabilities.routes.ts`
- Modify: `backend/src/modules/jira/jira.routes.ts`
- Modify: `backend/src/modules/notifications/notifications.routes.ts`
- Modify: `backend/src/modules/llm/llm.routes.ts`

Em `vulnerabilities.routes.ts`:
- Remover o `mockAuth` completamente
- Usar `router.use(authenticate)` no lugar
- Adicionar `requireRoles(['ADMIN', 'SEGURANCA'])` no DELETE /all
- Adicionar `requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR'])` no POST (create) e DELETE /:id

Em `jira.routes.ts`:
- Remover mockAuth
- Usar authenticate

Em `notifications/notifications.routes.ts`:
- Adicionar authenticate em todas as rotas
- Adicionar `requireRoles(['ADMIN', 'SEGURANCA', 'GESTOR'])` nos triggers e send

Em `llm/llm.routes.ts`:
- Adicionar authenticate

---

## Task 8: Logout e exibição do usuário logado

**Files:**
- Modify: `components/app-sidebar.tsx` (ou layout correspondente)

Adicionar no sidebar/header:
- Nome do usuário logado (de localStorage)
- Role badge
- Botão de logout que limpa cookie + localStorage e redireciona para /login
