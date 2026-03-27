# EpicVuln - Unisys Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform VulnControl (CredSystem) into EpicVuln (Unisys) — new brand, green theme, IBM RTC only, no Jira/DORA/Ativos.

**Architecture:** Full rebrand of existing Next.js + Express + Prisma stack. Replace all CredSystem/VulnControl references with Unisys/EpicVuln. Remove Jira integration module, DORA metrics page, and Assets/Ativos page. Keep IBM RTC as sole integration. Change color scheme from blue to green (Unisys brand).

**Tech Stack:** Next.js 16, Express.js, Prisma, PostgreSQL, TailwindCSS, IBM RTC OSLC API

---

## Summary of Changes

### REMOVE entirely:
- `app/(dashboard)/ativos/` — Assets page (both list and detail)
- `app/(dashboard)/metricas/` — DORA metrics page
- `backend/src/modules/jira/` — Jira integration module
- `backend/src/modules/assets/` — Assets backend module
- All Jira references in integrations-settings, routes, sidebar
- All CredSystem seed data and references

### REBRAND:
- "VulnControl" → "EpicVuln" everywhere
- "Security Platform" → "Vulnerability Management"
- Color: blue-500/600 → emerald-500/600 (green theme)
- Logo icon: Shield → Shield with green gradient
- Admin user: admin@credsystem.com.br → admin@unisys.com
- localStorage key: vulncontrol_user → epicvuln_user

### KEEP as-is:
- Dashboard (main page)
- Vulnerabilidades (list, detail, create)
- Kanban
- Squads
- Inteligencia (AI)
- Relatórios
- Notificações
- Configurações
- Onboarding
- IBM RTC integration

---

### Task 1: Rebrand — Global text replacement (VulnControl → EpicVuln)

**Files to modify (source only, not dist/):**
- `app/layout.tsx` — page title
- `app/login/page.tsx` — login branding
- `app/onboarding/page.tsx` — onboarding branding
- `components/app-sidebar.tsx` — sidebar logo text
- `components/integrations-settings.tsx` — references
- `components/preferences-provider.tsx` — references
- `lib/auth.ts` — localStorage key `vulncontrol_user` → `epicvuln_user`
- `lib/vuln-store.ts` — any references
- `backend/package.json` — package name
- `backend/prisma/seed.ts` — seed console output
- `backend/src/index.ts` — server log
- `backend/src/modules/llm/llm.service.ts` — AI system prompt
- `backend/src/modules/reports/reports.service.ts` — PDF header
- `backend/src/modules/reports/reports.controller.ts` — references
- `backend/src/services/email-templates.ts` — email branding
- `backend/src/services/sla-scheduler.service.ts` — references

**Step 1:** Replace "VulnControl" with "EpicVuln" in all source files listed above.
**Step 2:** Replace "vulncontrol" with "epicvuln" in localStorage keys, package names, container names.
**Step 3:** Replace "Security Platform" with "Vulnerability Management" in sidebar.

---

### Task 2: Rebrand — CredSystem → Unisys

**Files to modify:**
- `backend/prisma/seed.ts` — change all @credsystem.com.br to @unisys.com
- `backend/src/index.ts` — change test user from teste@gmail.com.br to admin@unisys.com
- `backend/src/modules/auth/auth.controller.ts` — any CredSystem refs
- `backend/src/modules/llm/llm.service.ts` — remove CredSystem business context
- `app/(dashboard)/configuracoes/page.tsx` — any CredSystem refs

**Step 1:** Update seed.ts users:
```typescript
const users = [
  { email: 'admin@unisys.com', name: 'Administrador', role: 'ADMIN' },
  { email: 'security@unisys.com', name: 'Analista AppSec', role: 'SEGURANCA' },
  { email: 'gestor@unisys.com', name: 'Gestor de Seguranca', role: 'GESTOR' },
  { email: 'squad@unisys.com', name: 'Dev Squad', role: 'SQUAD' },
  { email: 'leitor@unisys.com', name: 'Auditor', role: 'LEITURA' },
];
```

**Step 2:** Update ensureTestUser in index.ts to create admin@unisys.com with password admin@123.

**Step 3:** Remove any hardcoded CredSystem business context from LLM service.

---

### Task 3: Green Theme — Blue → Emerald/Green

**Files to modify:**
- `app/(dashboard)/layout.tsx` — gradient from blue to emerald
- `app/login/page.tsx` — login page colors
- `components/app-sidebar.tsx` — sidebar gradient and active states
- `components/app-topbar.tsx` — any blue refs
- `components/risk-gauge.tsx` — any blue refs
- `app/(dashboard)/page.tsx` — dashboard cards blue refs
- `app/(dashboard)/kanban/page.tsx` — kanban header colors
- `app/(dashboard)/configuracoes/page.tsx` — settings active tab
- `app/(dashboard)/vulnerabilidades/page.tsx` — blue accents
- `app/(dashboard)/inteligencia/page.tsx` — blue accents
- `app/(dashboard)/relatorios/page.tsx` — blue accents
- `app/(dashboard)/squads/page.tsx` — blue accents
- `app/onboarding/page.tsx` — blue accents
- `globals.css` or `tailwind.config` if relevant

**Color mapping:**
- `blue-500` → `emerald-500`
- `blue-600` → `emerald-600`
- `blue-400` → `emerald-400`
- `blue-500/5` → `emerald-500/5`
- `blue-500/10` → `emerald-500/10`
- `blue-500/15` → `emerald-500/15`
- `blue-500/20` → `emerald-500/20`
- `blue-500/25` → `emerald-500/25`
- `blue-500/30` → `emerald-500/30`
- `from-blue-500 to-blue-600` → `from-emerald-500 to-emerald-600`
- `shadow-blue-*` → `shadow-emerald-*`
- `text-blue-*` → `text-emerald-*`
- `bg-blue-*` → `bg-emerald-*`
- `border-blue-*` → `border-emerald-*`

**IMPORTANT:** Only replace blue that is used as PRIMARY/BRAND color. Keep blue used for charts, specific semantic meaning (info badges, etc.).

---

### Task 4: Remove Assets/Ativos Pages and Backend

**Delete:**
- `app/(dashboard)/ativos/` — entire directory (page.tsx + [id]/page.tsx)
- `backend/src/modules/assets/` — entire directory

**Modify:**
- `components/app-sidebar.tsx` — remove Ativos menu item `{ href: "/ativos", label: "Ativos", icon: Server }`
- `backend/src/modules/routes.ts` — remove assets routes import and registration
- `backend/prisma/schema.prisma` — keep Asset model (used by Vulnerability FK) but it becomes internal-only, no UI

**Step 1:** Delete the frontend ativos directory.
**Step 2:** Remove sidebar menu item.
**Step 3:** Remove assets routes from backend router.

---

### Task 5: Remove DORA Metrics Page

**Delete:**
- `app/(dashboard)/metricas/` — entire directory

**Modify:**
- `components/app-sidebar.tsx` — remove Métricas DORA menu item `{ href: "/metricas", label: "Metricas DORA", icon: BarChart3 }`
- `app/(dashboard)/relatorios/page.tsx` — remove DORA card that navigates to /metricas

**Step 1:** Delete the metricas directory.
**Step 2:** Remove sidebar menu item.
**Step 3:** Remove DORA navigation card from reports hub.

---

### Task 6: Remove Jira Integration

**Delete:**
- `backend/src/modules/jira/` — entire directory

**Modify:**
- `backend/src/modules/routes.ts` — remove jira routes
- `components/integrations-settings.tsx` — remove Jira config section, keep only IBM RTC
- `app/(dashboard)/kanban/page.tsx` — remove "Sync Jira" button, add "Sync RTC" button
- `app/(dashboard)/vulnerabilidades/page.tsx` — remove Jira import option if present
- `backend/src/modules/imports/imports.routes.ts` — remove Jira-related import endpoints

**Step 1:** Delete jira module directory.
**Step 2:** Remove jira routes from router.
**Step 3:** Update integrations settings to only show IBM RTC.
**Step 4:** Replace "Sync Jira" with "Sync RTC" in Kanban.

---

### Task 7: Enhance IBM RTC Integration for Unisys Epic Format

**Modify:**
- `backend/src/modules/rtc/rtc.service.ts` — update field mapping for Unisys Epic format

**RTC Epic fields to extract (from user's PDF):**
- Title: `[EPICO] Pentest Unisys - Sqd Parametros:XSS Refletido` → parse vuln name
- Criticidade (Gravidade): Alta → map to Criticidade enum
- Squad: `NM182 - Originação e Entrada de Dados - SIACI` → parse squad name
- Data de Criação: `27/11/2025, 16:18:29` → parse to DateTime
- Criado Por: `Matheus Amadeu Ferreira Nina` → set as responsavel
- Descrição: full text → descricaoTecnica
- Tipo de Item: `Épico` → filter only Épico type

**Step 1:** Update RTC service field mapping to handle Unisys Epic format.
**Step 2:** Add title parser to extract vulnerability name from `[EPICO] Pentest Unisys - Sqd X:VulnName`.
**Step 3:** Map RTC severity values to Prisma Criticidade enum.
**Step 4:** Parse squad from the RTC squad field format.

---

### Task 8: Update Seed Data and Default Admin

**Modify:**
- `backend/prisma/seed.ts` — all users @unisys.com
- `backend/src/index.ts` — ensureTestUser → admin@unisys.com / admin@123

**Step 1:** Replace all credsystem emails with unisys.com.
**Step 2:** Change default admin credentials.
**Step 3:** Update console output messages.

---

### Task 9: Docker Build and Deploy

**Step 1:** Run `docker compose build --no-cache` for both frontend and backend.
**Step 2:** Run `docker compose up -d --force-recreate`.
**Step 3:** Run prisma db push to sync schema.
**Step 4:** Run seed to create Unisys admin user.
**Step 5:** Verify login with admin@unisys.com.

---

## Execution Order

1. Task 1 (text rebrand) — independent
2. Task 2 (CredSystem → Unisys) — independent
3. Task 3 (green theme) — independent
4. Task 4 (remove ativos) — independent
5. Task 5 (remove DORA) — independent
6. Task 6 (remove Jira) — independent
7. Task 7 (RTC enhancement) — depends on Task 6
8. Task 8 (seed data) — depends on Task 2
9. Task 9 (build & deploy) — depends on all above

Tasks 1-6 are independent and can be parallelized.
