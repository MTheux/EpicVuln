/**
 * Demo provider — deterministic mock responses.
 *
 * Lets the UI work end-to-end without any external LLM. Useful for:
 * - Apresentação/demo da plataforma sem precisar de chave
 * - Smoke testing
 * - Offline development
 *
 * Detecta o tipo de chamada por keywords no system prompt e retorna
 * uma resposta JSON plausível pré-fabricada.
 */

export async function demoRespond(systemPrompt: string, userMessage: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600)); // simulate ~600ms latency

  const p = systemPrompt.toLowerCase();

  // ----- Zekrom: generate plan -----
  if (p.includes('zekrom') && p.includes('checklist')) {
    return JSON.stringify(demoPlan(userMessage));
  }

  // ----- Zekrom: generate guidance -----
  if (p.includes('zekrom') && p.includes('payloadexamples')) {
    return JSON.stringify(demoGuidance(userMessage));
  }

  // ----- New AISEC skills FIRST (their prompts may mention generic keywords that match older handlers) -----
  // Forge: code modernization
  if (p.includes('forge') && p.includes('modernizedcode')) {
    return JSON.stringify(demoForge(userMessage));
  }
  // Mirror: threat modeling com RAG
  if (p.includes('mirror') && p.includes('attacktree')) {
    return JSON.stringify(demoMirror(systemPrompt, userMessage));
  }
  // Audit: compliance
  if (p.includes('audit') && p.includes('planoremediacao')) {
    return JSON.stringify(demoAudit(systemPrompt, userMessage));
  }

  // ----- generateEpic (épico RTC) -----
  if (p.includes('épico rtc') || p.includes('descricaotecnica')) {
    return JSON.stringify(demoEpic(userMessage));
  }

  // ----- analyzeArchitecture (STRIDE) -----
  if (p.includes('stride') && p.includes('attacktree')) {
    return JSON.stringify(demoArchitecture(userMessage));
  }

  // ----- generateAnalysis (executive) -----
  if (p.includes('resumoexecutivo') || p.includes('topvulnerabilities')) {
    return JSON.stringify(demoAnalysis());
  }

  // ----- generateAttackGraph -----
  if (p.includes('attack graph') || (p.includes('scenarios') && p.includes('impactcategory'))) {
    return JSON.stringify(demoAttackGraph());
  }

  // ----- HackBot chat (plain text, not JSON) -----
  if (p.includes('hackbot')) {
    return demoHackBotReply(userMessage, systemPrompt);
  }

  // ----- Control mitigation (SDL checklist) -----
  if (p.includes('codigomitigacao') || p.includes('descricaoexpandida')) {
    return JSON.stringify(demoControlMitigation(userMessage));
  }

  // ----- Fallback -----
  return JSON.stringify({
    resposta: 'UnisysGuard (modo demo): resposta mock — configure um provider real em Integrações para análise viva.',
    eco: userMessage.slice(0, 200),
  });
}

function demoControlMitigation(userMsg: string): any {
  const titulo = (userMsg.match(/T[ií]tulo:\s*(.+)/) || [, ''])[1].toLowerCase();
  const cat = (userMsg.match(/Categoria:\s*(.+)/) || [, ''])[1].toLowerCase();

  if (/idor|bola|ownership/i.test(titulo + ' ' + cat)) {
    return {
      descricaoExpandida: "Validação de ownership é obrigatória em qualquer endpoint que receba um identificador. O backend nunca pode confiar que o ID na URL pertence ao usuário autenticado — precisa checar contra o sub do JWT/sessão. Falha desse controle leva a vazamento de dados de outros clientes (LGPD), tomada de conta (account takeover) e fraude transacional no contexto PIX/SIACI.",
      codigoMitigacao: "```csharp\n// ASP.NET Core - Entity Framework\n[Authorize]\n[HttpGet(\"transferencias/{id}\")]\npublic async Task<IActionResult> GetTransferencia(Guid id)\n{\n    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);\n    var transferencia = await _db.Transferencias\n        .FirstOrDefaultAsync(t => t.Id == id && t.UsuarioId == userId);\n    if (transferencia == null) return NotFound();\n    return Ok(transferencia);\n}\n```\n\n```javascript\n// Node.js / Sequelize\nrouter.get('/transferencias/:id', authMiddleware, async (req, res) => {\n  const t = await Transferencia.findOne({\n    where: { id: req.params.id, usuarioId: req.user.id }\n  });\n  if (!t) return res.status(404).json({ error: 'not found' });\n  res.json(t);\n});\n```",
      comoTestar: "1. Login como User A. Faça GET /transferencias/123 e anote o ID.\n2. Login como User B. Faça GET /transferencias/123 (ID do User A).\n3. Esperado: 404 ou 403. Vulnerável: 200 com dados do User A.\n4. Automatize com extensão Autorize do Burp Suite.\n5. OWASP ASVS V4.1.3.",
      errosComuns: [
        "Confiar apenas em filtros do front-end pra esconder recursos de outros users",
        "Usar IDs sequenciais (auto-increment) ao invés de UUIDs aleatórios",
        "Esquecer de incluir tenant_id no filtro em apps multi-tenant",
        "Validar ownership só em GET, esquecendo de PUT/DELETE",
      ],
    };
  }

  if (/sql\s*injection|sqli|prepared/i.test(titulo)) {
    return {
      descricaoExpandida: "SQL Injection acontece quando input do usuário é concatenado diretamente em uma query SQL. Prepared statements parametrizam a query — o input nunca vira código executável. Em ASP.NET use ADO.NET com SqlParameter ou Entity Framework com LINQ (que parametriza automaticamente). Stored procedures parametrizadas também resolvem. NUNCA construa SQL com string concatenation.",
      codigoMitigacao: "```csharp\n// ❌ ERRADO - Injection trivial\nvar sql = $\"SELECT * FROM Users WHERE name='{name}'\";\nvar cmd = new SqlCommand(sql, conn);\n\n// ✅ CERTO - ADO.NET parametrizado\nvar cmd = new SqlCommand(\"SELECT * FROM Users WHERE name = @name\", conn);\ncmd.Parameters.AddWithValue(\"@name\", name);\n\n// ✅ CERTO - Entity Framework (LINQ é safe)\nvar user = await _db.Users.FirstOrDefaultAsync(u => u.Name == name);\n\n// ✅ CERTO - Dapper\nvar user = conn.QueryFirstOrDefault<User>(\n    \"SELECT * FROM Users WHERE name = @name\", new { name });\n```",
      comoTestar: "1. Em todo input de form/URL, teste payloads: `'`, `' OR 1=1--`, `'; DROP TABLE--`.\n2. Use sqlmap (autorizado) contra endpoints em HML.\n3. Verifique se há tratamento de erro silencioso (vuln) vs erro 500 verbose (mais vuln).\n4. Tente time-based blind: `' AND SLEEP(5)--`.\n5. ASVS V5.3.4.",
      errosComuns: [
        "Achar que escape de aspas resolve (não resolve em todos os casos)",
        "Usar stored procedure mas com EXEC dinâmico dentro",
        "Confiar em ORM mas usar .FromSqlRaw() com string concat",
        "Esquecer que filtros LIKE precisam escapar % e _",
      ],
    };
  }

  if (/xss|encoding|cross.site script/i.test(titulo + ' ' + cat)) {
    return {
      descricaoExpandida: "XSS acontece quando input do usuário é renderizado no HTML sem encoding contextual. ASP.NET Razor encoda automaticamente em @Variable mas NÃO em @Html.Raw(). Use AntiXSS library ou HtmlEncoder.Default.Encode() pra HTML, JavaScriptEncoder pra inline JS, UrlEncoder pra URLs. Adicione CSP estrita (strict-dynamic + nonce) como defense-in-depth.",
      codigoMitigacao: "```csharp\n// ASP.NET Core - encoding contextual\nusing System.Text.Encodings.Web;\n\n// HTML output\nvar safe = HtmlEncoder.Default.Encode(userInput);\n\n// Razor (auto-encoda)\n@Model.Comment  // ✅ safe\n@Html.Raw(Model.Comment)  // ❌ XSS\n\n// JSON pra inline JS\nvar safeJs = JavaScriptEncoder.Default.Encode(userInput);\n\n// CSP middleware (Startup.cs)\napp.Use(async (ctx, next) => {\n    ctx.Response.Headers.Add(\"Content-Security-Policy\",\n        \"default-src 'self'; script-src 'self' 'nonce-RANDOM'\");\n    await next();\n});\n\n// Cookies HttpOnly + Secure\noptions.Cookie.HttpOnly = true;\noptions.Cookie.SecurePolicy = CookieSecurePolicy.Always;\noptions.Cookie.SameSite = SameSiteMode.Strict;\n```",
      comoTestar: "1. Payloads: `<script>alert(1)</script>`, `<svg onload=alert(1)>`, `<img src=x onerror=alert(1)>`.\n2. Teste em todo input refletido na resposta (search, filtros, mensagens de erro).\n3. Stored: teste em profile, comments, settings.\n4. DOM: inspecione JS em busca de innerHTML/document.write com input do user.\n5. Confirme: header CSP presente e estrita; cookies com HttpOnly.",
      errosComuns: [
        "Filtrar apenas <script> deixando <svg>, <img onerror>, eventos",
        "Confiar em sanitização do front-end (atacante bypassa)",
        "Encoding HTML em contexto JS (ainda executa)",
        "CSP permissiva: 'unsafe-inline' anula a proteção",
      ],
    };
  }

  if (/jwt|token/i.test(titulo)) {
    return {
      descricaoExpandida: "JWT precisa ser validado com algoritmo fixo (nunca confiar no alg do header), assinatura verificada contra a chave correta, e claims iss/aud/exp/nbf checados. Falha = forge de token de qualquer usuário. Em ASP.NET use AddJwtBearer com TokenValidationParameters completos.",
      codigoMitigacao: "```csharp\n// ASP.NET Core - JWT validation correto\nbuilder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)\n    .AddJwtBearer(opts => {\n        opts.TokenValidationParameters = new TokenValidationParameters {\n            ValidateIssuer = true,\n            ValidIssuer = \"https://auth.caixa.gov.br\",\n            ValidateAudience = true,\n            ValidAudience = \"siaci-api\",\n            ValidateLifetime = true,\n            ClockSkew = TimeSpan.FromSeconds(30),\n            ValidateIssuerSigningKey = true,\n            IssuerSigningKey = new RsaSecurityKey(rsaPublicKey),\n            ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 }  // fixa alg\n        };\n    });\n```",
      comoTestar: "1. Decode JWT, mude alg pra none, assinatura vazia → deve dar 401.\n2. Troque alg de RS256 pra HS256 usando pubkey como secret → 401.\n3. Token expirado → 401.\n4. Token de outro audience → 401.\n5. Use JWT Inspector da plataforma.",
      errosComuns: [
        "Não fixar ValidAlgorithms (aceita qualquer alg do header)",
        "ClockSkew muito alto (1h+) — janela de replay grande",
        "Validar localmente mas não checar revocation list",
        "Logar JWT inteiro (vaza pra logs/monitoring)",
      ],
    };
  }

  // Generic fallback
  return {
    descricaoExpandida: `O controle "${titulo}" mitiga riscos comuns descritos em ${cat}. Implementação varia conforme contexto, mas o princípio é: validar/sanitizar/autenticar/autorizar no servidor, nunca confiar no client. Configure provider real (GitHub Models, Ollama) pra recomendação técnica completa.`,
    codigoMitigacao: "```csharp\n// ASP.NET Core - exemplo genérico de validação server-side\npublic async Task<IActionResult> Endpoint([FromBody] InputDto input)\n{\n    if (!ModelState.IsValid) return BadRequest(ModelState);\n    \n    // 1. Authn check\n    if (!User.Identity.IsAuthenticated) return Unauthorized();\n    \n    // 2. Authz check (resource-based)\n    var canAccess = await _authz.AuthorizeAsync(User, input.ResourceId, \"OwnerOnly\");\n    if (!canAccess.Succeeded) return Forbid();\n    \n    // 3. Business logic com input sanitizado\n    // ...\n}\n```",
    comoTestar: "Validar comportamento em 3 cenários: usuário anônimo, usuário válido sem permissão, usuário válido com permissão. Confirmar 401/403/200 respectivamente.",
    errosComuns: [
      "Validar só no client",
      "Confundir authentication com authorization",
      "Erros vazando detalhes técnicos",
    ],
  };
}

function demoHackBotReply(userMsg: string, systemPrompt?: string): string {
  const last = (userMsg.match(/MENSAGEM ATUAL DO USUÁRIO:\s*([\s\S]*)$/) || [, userMsg])[1].toLowerCase();

  // Live Portfolio Context — se o system prompt trouxe vulns do AISEC, prioriza resposta baseada nelas
  if (systemPrompt && systemPrompt.includes('PORTFÓLIO ATIVO')) {
    const vulnCodes = [...systemPrompt.matchAll(/\[(VUL-CXA-\d+)[^\]]*\]/g)].map((m) => m[1]);
    const titles = [...systemPrompt.matchAll(/Título:\s*(.+)/g)].map((m) => m[1]);
    const endpoints = [...systemPrompt.matchAll(/Endpoint:\s*(.+)/g)].map((m) => m[1]);
    const evidences = [...systemPrompt.matchAll(/Evidência\/PoC já cadastrada:\n([\s\S]*?)(?=Recomendação cadastrada:|Match:|─)/g)].map((m) => m[1].trim());
    if (vulnCodes.length > 0) {
      const lines: string[] = [];
      lines.push(`**Live Portfolio Context** — encontrei ${vulnCodes.length} vuln(s) ativa(s) no AISEC matchando sua pergunta. Vou priorizar esses dados reais ao invés de gerar payload genérico.\n`);
      vulnCodes.slice(0, 3).forEach((code, i) => {
        lines.push(`### ${code} · ${titles[i] || ''}`);
        if (endpoints[i]) lines.push(`Endpoint: \`${endpoints[i]}\``);
        if (evidences[i]) {
          const trimmed = evidences[i].split('\n').slice(0, 14).join('\n');
          lines.push('\n```\n' + trimmed + '\n```\n');
        }
        lines.push('');
      });
      lines.push('\n> Pra ver a evidência completa abra **/vulnerabilidades** e busca pelo código.\n');
      lines.push('> *Content Created By/With Use of AI · baseado em portfólio AISEC cadastrado · Unisys AI P1.0*');
      return lines.join('\n');
    }
  }

  if (/xss/.test(last)) {
    return `**XSS — análise rápida**

Tipos comuns:
- **Refletido**: input volta na resposta sem encoding
- **Stored**: input persiste e é renderizado pra outros users
- **DOM-based**: sink no JavaScript (innerHTML, document.write)

Payloads pra testar:
\`\`\`
<script>alert(1)</script>
<svg onload=alert(1)>
<img src=x onerror=alert(1)>
javascript:alert(1)  // em href / src
\`\`\`

Pra Caixa, foco no impacto: cookie hijack (testar se HttpOnly tá set) → sessão de Internet Banking comprometida.

Use o **Gerador de Épicos** com o print da PoC + alvo + descrição "xss" — gero o épico RTC completo pra você.

> *Content Created By/With Use of AI · UnisysGuard demo*`;
  }

  if (/sqli|sql/.test(last)) {
    return `**SQL Injection — checklist**

1. **Detecção**:
   - \`'\` simples → erro SQL? Já é SQLi
   - \`' OR 1=1--\` em login → bypass?
   - \`' AND SLEEP(5)--\` → time-based

2. **Tipos**: Error-based, Union-based, Boolean blind, Time blind

3. **Ferramentas**: SQLMap (autorizado em HML/QA only), Burp Intruder com payloads

4. **Mitigação no código C# (Caixa)**:
\`\`\`csharp
// ❌ ERRADO
var cmd = "SELECT * FROM users WHERE name='" + name + "'";
// ✅ CERTO
var cmd = new SqlCommand("SELECT * FROM users WHERE name=@n", conn);
cmd.Parameters.AddWithValue("@n", name);
\`\`\`

Quer que eu gere o épico RTC? Manda o request bruto.

> *Content Created By/With Use of AI · UnisysGuard demo*`;
  }

  if (/idor|bola/.test(last)) {
    return `**IDOR / BOLA — passos pra testar**

1. Faça uma operação normal logado como User A. Anote os IDs no path/body.
2. Substitua o ID por um do User B (incremento sequencial ou enumeração).
3. Repita o request com o token do User A.
4. Se voltar dados do User B → **IDOR**.

Padrões pra atacar:
- \`GET /api/account/{id}\` → trocar id
- \`GET /api/orders?user_id=123\` → trocar query
- Numéricos sequenciais são alvo fácil

Severidade Caixa: **CRÍTICA** se expor dados de transferência, conta ou cliente.

> *Content Created By/With Use of AI · UnisysGuard demo*`;
  }

  if (/jwt|token/.test(last)) {
    return `**JWT — pontos críticos**

Cola o token no **JWT Inspector** (/pentest/jwt-inspector) pra análise completa client-side. Confere:

- \`alg: none\` aceito? → forge instantâneo
- HS256 com chave pública RSA? → algorithm confusion
- \`exp\` ausente? token eterno
- \`aud\` ausente? token de serviço A vale em B
- \`kid\` com \`../\` ou SQL? injection
- Payload com CPF/senha visível? LGPD

Quer que eu sugira payloads forjados? Cola o header decodificado.

> *Content Created By/With Use of AI · UnisysGuard demo*`;
  }

  if (/payload|exploit/.test(last)) {
    return `Me dá mais contexto:
- Qual é o alvo (URL + endpoint)?
- Que tipo de vuln você suspeita?
- Tem o request bruto? (cola aqui)

Posso sugerir payloads pra: XSS, SQLi, SSRF, RCE, LFI, IDOR, JWT forge, CSRF, Open Redirect, XXE, Command Injection.

> *UnisysGuard demo · pra payloads mais ricos configure GitHub Models ou Ollama*`;
  }

  if (/help|ajuda|começar|comecar/.test(last)) {
    return `**HackBot — auxiliar do pentester Unisys/Caixa**

Posso te ajudar com:
- 🎯 Interpretar requests/responses do Burp
- 🧪 Sugerir payloads (XSS, SQLi, SSRF, IDOR, JWT, etc)
- 📋 Explicar OWASP Top 10 (Web + API)
- 🛠 Apontar pra skills da plataforma: Zekrom DAST, JWT Inspector, Gerador de Épicos, Análise STRIDE, JSHunter
- 📜 Gerar checklists OWASP customizados

Eu **não executo nada** — só sugiro. Toda exploração você roda manualmente (Unisys AI P1.0).

Manda o que tá investigando.

> *Content Created By/With Use of AI · UnisysGuard demo*`;
  }

  // generic fallback
  return `Recebi: "${last.slice(0, 100)}..."

Pra resposta mais útil, me passa:
- O alvo (URL/endpoint)
- O request bruto (se tiver)
- O que você suspeita

Ou pergunta sobre: XSS, SQLi, IDOR, JWT, SSRF, Open Redirect, JWT, OWASP API, OWASP Web.

> *Modo demo ativo. Pra respostas com IA real configure provider em Configurações → Integrações → IA. Recomendado: GitHub Models (Unisys-approved) ou Ollama (local).*`;
}

function demoPlan(userMsg: string) {
  // Try to extract endpoints from userMsg
  const endpoints = [...userMsg.matchAll(/"path":\s*"([^"]+)"/g)].slice(0, 8).map((m) => m[1]);
  const methods = [...userMsg.matchAll(/"method":\s*"([^"]+)"/g)].slice(0, 8).map((m) => m[1]);
  const pairs = endpoints.map((p, i) => ({ path: p, method: methods[i] || 'GET' }));
  if (pairs.length === 0) {
    pairs.push(
      { path: '/api/transferencias/{id}', method: 'GET' },
      { path: '/api/transferencias', method: 'POST' },
      { path: '/api/admin/usuarios', method: 'GET' },
    );
  }
  // Detect scope from msg (web vs api vs both)
  const scopeMatch = userMsg.match(/Escopo:\s*(api|web|both)/i);
  const scope: 'api' | 'web' | 'both' = (scopeMatch?.[1].toLowerCase() as any) || 'both';
  const includeWeb = scope === 'web' || scope === 'both';
  const includeApi = scope === 'api' || scope === 'both';

  // Detect if title/spec mentions web target (HTML, form, etc)
  const isHtmlTarget = /\[Web\]|html|form|csrf/i.test(userMsg);

  const tests: any[] = [];
  for (const { path, method } of pairs) {
    const isFormLike = /formdata|form\b/i.test(userMsg) || path === '/' || isHtmlTarget;
    const hasQueryParams = /query|tfsearch|q=|search=/i.test(path) || path.includes('?');

    // ----- WEB Top 10 tests -----
    if (includeWeb && (isFormLike || hasQueryParams || isHtmlTarget)) {
      // XSS for input fields
      if (hasQueryParams || isFormLike) {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'A03:2021',
          category: 'XSS Refletido',
          severity: 'ALTA',
          rationale: `Input do usuário (${hasQueryParams ? 'query string' : 'form'}) refletido na resposta. Testar payloads <script>, <img onerror>, <svg onload>.`,
        });
      }
      // CSRF for state-changing
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'A01:2021',
          category: 'CSRF',
          severity: 'ALTA',
          rationale: `${method} state-changing — verificar token CSRF, SameSite cookie, header Origin/Referer.`,
        });
      }
      // Open redirect
      if (/redirect|next|url|return/i.test(path)) {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'A01:2021',
          category: 'Open Redirect',
          severity: 'MEDIA',
          rationale: 'Parâmetro de redirect — testar URLs externas + variações (//evil.com, javascript:, data:).',
        });
      }
      // Security headers
      tests.push({
        endpoint: path,
        method,
        owaspId: 'A05:2021',
        category: 'Security Misconfiguration — Headers',
        severity: 'MEDIA',
        rationale: 'Verificar CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Cookie HttpOnly/Secure/SameSite.',
      });
    }

    // ----- API Top 10 tests -----
    if (includeApi && !isHtmlTarget) {
      if (/\{.*?id.*?\}/i.test(path) || path.includes('/{')) {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'API1:2023',
          category: 'Broken Object Level Authorization (BOLA)',
          severity: 'CRITICA',
          rationale: `Endpoint expõe ID no path. Validar ownership contra sub do JWT.`,
        });
      }
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'API3:2023',
          category: 'Mass Assignment',
          severity: 'ALTA',
          rationale: `${method} aceita body — testar campos extras (role, isAdmin, balance).`,
        });
      }
      if (path.includes('/admin') || path.includes('/management')) {
        tests.push({
          endpoint: path,
          method,
          owaspId: 'API5:2023',
          category: 'Broken Function Level Authorization',
          severity: 'CRITICA',
          rationale: 'Endpoint administrativo — testar acesso com usuário comum, 401/403 bypass.',
        });
      }
    }

    // ----- SQLi and Injection (both web and api) -----
    if (hasQueryParams || method === 'POST') {
      tests.push({
        endpoint: path,
        method,
        owaspId: includeApi && !isHtmlTarget ? 'API8:2023' : 'A03:2021',
        category: 'SQL Injection',
        severity: 'CRITICA',
        rationale: `Parâmetros aceitos pelo backend — testar payloads SQLi (\' OR 1=1--, UNION SELECT, time-based).`,
      });
    }
  }

  // Always add rate-limit
  if (pairs.length > 0) {
    tests.push({
      endpoint: pairs[0].path,
      method: pairs[0].method,
      owaspId: includeApi ? 'API4:2023' : 'A04:2021',
      category: 'Rate Limit / DoS',
      severity: 'MEDIA',
      rationale: 'Testar rate-limit por IP/usuário, brute-force, pagination DoS, payload grande.',
    });
  }
  return tests;
}

function demoGuidance(userMsg: string) {
  const isBola = userMsg.toLowerCase().includes('bola') || userMsg.includes('API1');
  const isAuth = userMsg.includes('API5') || userMsg.toLowerCase().includes('function level');
  const baseUrl = (userMsg.match(/BASE URL:\s*(\S+)/) || [])[1] || 'https://api.caixa.gov.br/v1';
  const endpoint = (userMsg.match(/ENDPOINT:\s*\w+\s+(\S+)/) || [])[1] || '/api/recurso/{id}';
  const idLike = endpoint.replace(/\{[^}]+\}/g, '12345');

  if (isBola) {
    return {
      hypothesis: 'Backend valida apenas que o ID existe, sem checar se o recurso pertence ao usuário do token JWT.',
      payloadExamples: [
        {
          description: 'Acesso ao recurso de outro usuário (IDOR horizontal)',
          curl: `curl -X GET "${baseUrl}${idLike}" -H "Authorization: Bearer <TOKEN_USER_A>"\n# Esperado: 403/404. Vulnerável: 200 com dados do User B.`,
          expectedSignal: 'HTTP 200 + body contém dados de outro usuário (CPF/conta/saldo diferente do JWT)',
        },
        {
          description: 'Enumeração sequencial de IDs',
          curl: `for i in $(seq 1 100); do curl -s -o /dev/null -w "%{http_code} " "${baseUrl}/api/recurso/$i" -H "Authorization: Bearer <TOKEN>"; done`,
          expectedSignal: 'Quase todos 200 → IDs sequenciais + sem ownership check',
        },
      ],
      detection: '1. Capture um GET válido com User A.\n2. Repita o request trocando para sessão do User B.\n3. Compare ID retornado vs ID do JWT (sub claim).\n4. Automatize com extensão Autorize do Burp.',
      mitigation: 'Query no backend deve ser: WHERE id = :id AND owner_id = :user_id_from_jwt. Em multi-tenant, incluir tenant_id. Usar UUIDs v4 ao invés de IDs sequenciais (OWASP ASVS V4.1.3).',
    };
  }

  if (isAuth) {
    return {
      hypothesis: 'Endpoint /admin/* não verifica role do usuário, aceitando token de usuário comum.',
      payloadExamples: [
        {
          description: 'Acesso direto com token de usuário SQUAD',
          curl: `curl "${baseUrl}${endpoint}" -H "Authorization: Bearer <TOKEN_SQUAD_USER>"`,
          expectedSignal: '200 OK → bypass; 403 → controle OK',
        },
        {
          description: 'JWT com role manipulada (alg=none)',
          curl: `# Decode JWT, mude "role":"user" → "role":"ADMIN", alg=none\ncurl "${baseUrl}${endpoint}" -H "Authorization: Bearer <FORGED_TOKEN>"`,
          expectedSignal: '200 OK = backend confia em claim role do client',
        },
      ],
      detection: 'Comparar comportamento com 3 perfis: ADMIN, SQUAD, LEITURA. Esperado: só ADMIN passa.',
      mitigation: 'Usar [Authorize(Roles="Admin")] em ASP.NET Core. Validar claim role server-side contra DB, não confiar no JWT. OWASP API5:2023.',
    };
  }

  // Generic
  return {
    hypothesis: 'Endpoint pode ter validação fraca de input ou autorização.',
    payloadExamples: [
      {
        description: 'Request baseline',
        curl: `curl -X GET "${baseUrl}${endpoint}" -H "Authorization: Bearer <TOKEN>"`,
        expectedSignal: '200 OK indica acesso',
      },
    ],
    detection: 'Capture o request normal, manipule cada parâmetro buscando: erro 500 (input não validado), comportamento anômalo, dados de outros usuários.',
    mitigation: 'Validação server-side de todos inputs, autorização baseada em ownership + role, rate-limit por IP+user.',
  };
}

function demoEpic(userMsg: string) {
  const alvo = (userMsg.match(/ALVO:\s*(\S+)/) || [])[1] || 'https://target/endpoint';
  const tipo = userMsg.includes('TIPO: API') ? 'API' : 'WEB';
  const desc = (userMsg.match(/DESCRIÇÃO BREVE DO PENTESTER:\s*([\s\S]+?)(?:\n\n|$)/) || [])[1] || '';
  const combined = (desc + ' ' + alvo).toLowerCase();
  const isCaixa = /caixa|pix|siaci|bacen/i.test(combined);

  const detected = detectVulnType(combined, alvo);
  const template = vulnTemplates[detected] || vulnTemplates.generic;

  const endpointName = alvo.split('?')[0].split('/').pop() || 'endpoint';

  return {
    titulo: `[${tipo}] ${endpointName} — ${template.titleSuffix}`,
    criticidade: template.severity,
    owasp: tipo === 'API' ? template.owaspApi : template.owaspWeb,
    endpoint: alvo,
    descricaoTecnica: template.descricaoTecnica(alvo, tipo),
    impacto: isCaixa ? template.impactoCaixa : template.impactoGenerico,
    mitigacao: template.mitigacao(tipo),
    riscos: isCaixa ? template.riscosCaixa : template.riscosGenerico,
  };
}

type VulnType = 'xss' | 'sqli' | 'csrf' | 'idor' | 'bola' | 'open_redirect' | 'ssrf' | 'rce' | 'lfi' | 'mass_assignment' | 'jwt' | 'auth_bypass' | 'generic';

function detectVulnType(combined: string, alvo: string): VulnType {
  const hasXssPayload = /<script|onerror|onload|javascript:|alert\(|<svg|<img/i.test(alvo);
  if (/\bxss\b|cross[-\s]?site\s+script|script\s+inject/i.test(combined) || hasXssPayload) return 'xss';
  if (/sql\s*inject|\bsqli\b|union\s+select|or\s+1\s*=\s*1/i.test(combined) || /['"]\s*(or|union)\s/i.test(alvo)) return 'sqli';
  if (/\bcsrf\b|cross[-\s]?site\s+request/i.test(combined)) return 'csrf';
  if (/\bidor\b|insecure\s+direct/i.test(combined)) return 'idor';
  if (/\bbola\b|object\s+level\s+auth/i.test(combined)) return 'bola';
  if (/open\s*redirect|redirect.*atacante|\?redirect=|\?next=|\?url=/i.test(combined + alvo)) return 'open_redirect';
  if (/\bssrf\b|server[-\s]?side\s+request/i.test(combined)) return 'ssrf';
  if (/\brce\b|command\s+inject|remote\s+code/i.test(combined)) return 'rce';
  if (/\blfi\b|local\s+file|path\s+traversal|\.\.\//i.test(combined + alvo)) return 'lfi';
  if (/mass\s+assignment|isadmin|role[=:]/i.test(combined)) return 'mass_assignment';
  if (/\bjwt\b|alg.*none|token.*forg/i.test(combined)) return 'jwt';
  if (/auth.*bypass|login.*bypass|brute.*force/i.test(combined)) return 'auth_bypass';
  return 'generic';
}

const vulnTemplates: Record<VulnType, {
  titleSuffix: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  owaspWeb: string;
  owaspApi: string;
  descricaoTecnica: (alvo: string, tipo: string) => string;
  impactoCaixa: string;
  impactoGenerico: string;
  mitigacao: (tipo: string) => string;
  riscosCaixa: string;
  riscosGenerico: string;
}> = {
  xss: {
    titleSuffix: 'Cross-Site Scripting (XSS) Refletido',
    severity: 'ALTA',
    owaspWeb: 'A03:2021 — Injection',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `Foi identificado XSS refletido no parâmetro da URL ${alvo}. O backend devolve o input do usuário diretamente no HTML da resposta, sem encoding contextual. Payload do tipo <script>alert(1)</script> é executado pelo navegador da vítima, demonstrando execução de JavaScript arbitrário no contexto da origem.`,
    impactoCaixa: 'Atacante consegue: (1) sequestrar sessão do cliente Caixa via document.cookie quando cookies não têm HttpOnly; (2) executar transferências PIX em nome da vítima usando o token de sessão dela; (3) capturar credenciais via fake login overlay; (4) exfiltrar dados PII visíveis no DOM violando LGPD.',
    impactoGenerico: 'Atacante executa JavaScript no contexto da vítima, podendo sequestrar sessão, roubar credenciais, alterar conteúdo da página e realizar ações em nome do usuário.',
    mitigacao: (tipo) => `1. Encoding contextual de saída: HtmlEncoder.Default.Encode() em ASP.NET para HTML, JavaScriptEncoder para JS, UrlEncoder para URLs.
2. Content-Security-Policy estrita com nonce ou hash em scripts inline.
3. Cookie de sessão com flags HttpOnly + Secure + SameSite=Strict.
4. ${tipo === 'WEB' ? 'Em Razor: usar @Variable (encoda) em vez de @Html.Raw().' : 'Não devolver input do usuário em respostas HTML sem encoding.'}
5. Validação de input (allowlist) mesmo com encoding correto.`,
    riscosCaixa: 'Risco regulatório alto: incidente reportável BACEN se sessões de cliente forem comprometidas. LGPD: notificação ANPD obrigatória em 72h se houver vazamento de dados pessoais. Dano reputacional severo em caso de phishing convincente usando o domínio legítimo.',
    riscosGenerico: 'Comprometimento em massa de sessões de usuário, defacement, distribuição de malware via página legítima, e perda de confiança dos usuários.',
  },
  sqli: {
    titleSuffix: 'SQL Injection',
    severity: 'CRITICA',
    owaspWeb: 'A03:2021 — Injection',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `SQL Injection detectado em ${alvo}. O backend concatena input do usuário diretamente em query SQL. Payloads como ' OR 1=1-- e ' UNION SELECT ... retornam dados ou erros que confirmam a injeção.`,
    impactoCaixa: 'Acesso direto à base SIACI: extração de dados de clientes (CPF, conta, saldo), alteração de transferências, criação de transações fraudulentas, e potencial RCE via xp_cmdshell / load_file. Violação grave LGPD + BACEN 4658.',
    impactoGenerico: 'Acesso total ao banco de dados: leitura, escrita, e possível RCE no servidor de banco.',
    mitigacao: (tipo) => `1. Prepared statements / parameterized queries SEM exceção: SqlCommand com SqlParameters em ADO.NET, ou Entity Framework com LINQ.
2. Stored procedures parametrizadas (não dinâmicas).
3. Princípio do menor privilégio: usuário do app no banco SEM permissão de DDL ou xp_cmdshell.
4. WAF com rules SQLi (defense in depth).
5. Logging de queries lentas/erradas para detecção.`,
    riscosCaixa: 'Incidente crítico reportável imediatamente ao BACEN. Multa LGPD até 2% do faturamento (50M reais teto). Possível freeze do produto pelo regulador. Custo médio de breach financeiro: 5-15M USD (IBM Cost of Data Breach).',
    riscosGenerico: 'Comprometimento total da base de dados, ransomware via stored procedures, supply chain attack via dados manipulados.',
  },
  csrf: {
    titleSuffix: 'Cross-Site Request Forgery (CSRF)',
    severity: 'ALTA',
    owaspWeb: 'A01:2021 — Broken Access Control',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `O endpoint ${alvo} aceita requisições state-changing sem token CSRF nem validação de Origin/Referer. Atacante hospeda página maliciosa que dispara a ação em nome da vítima autenticada.`,
    impactoCaixa: 'Transferências PIX disparadas sem consentimento do cliente quando ele visita site malicioso autenticado no Internet Banking. Alteração de senha, mudança de e-mail/celular cadastrado para sequestro de conta.',
    impactoGenerico: 'Ações state-changing realizadas em nome do usuário sem consentimento — alteração de dados, transações, exclusão de recursos.',
    mitigacao: (tipo) => `1. Anti-forgery token: [ValidateAntiForgeryToken] em ASP.NET Core MVC, @Html.AntiForgeryToken() nos forms.
2. Cookie de sessão com SameSite=Strict (ou Lax + CSRF token).
3. Validar header Origin/Referer para requisições state-changing.
4. Re-autenticação para ações sensíveis (transferência > R$ 1000).
5. Para APIs: exigir custom header (X-Requested-With) que sites cross-origin não conseguem enviar sem CORS permission.`,
    riscosCaixa: 'Fraude transacional em massa via campanhas de phishing direcionadas. Reportação BACEN obrigatória se houver perda financeira.',
    riscosGenerico: 'Tomada de conta, ações não autorizadas atribuídas ao usuário, fraude.',
  },
  idor: {
    titleSuffix: 'Insecure Direct Object Reference (IDOR)',
    severity: 'CRITICA',
    owaspWeb: 'A01:2021 — Broken Access Control',
    owaspApi: 'API1:2023 — Broken Object Level Authorization',
    descricaoTecnica: (alvo) => `Em ${alvo}, o backend autoriza acesso ao recurso baseado apenas no ID fornecido, sem checar se o objeto pertence ao usuário autenticado. Troca de ID na URL ou body retorna dados de outros usuários.`,
    impactoCaixa: 'Acesso indevido a dados de outros clientes Caixa: extratos, transferências, contratos imobiliários SIACI. Violação massiva LGPD por exposição de dados pessoais de terceiros.',
    impactoGenerico: 'Acesso a recursos de outros usuários — leitura, modificação ou exclusão de dados que não pertencem ao atacante.',
    mitigacao: (tipo) => `1. Toda query deve filtrar por ownership: WHERE id = :id AND owner_id = :user_id_from_jwt.
2. Em multi-tenant, incluir tenant_id no filtro.
3. Usar UUIDs v4 aleatórios em vez de IDs sequenciais.
4. Em ASP.NET Core: middleware de autorização baseado em policy (ex: [Authorize(Policy="OwnerOnly")]).
5. Code review obrigatório de endpoints que recebem IDs.`,
    riscosCaixa: 'Vazamento de dados de clientes em escala. Multa LGPD certa. Possível class action.',
    riscosGenerico: 'Comprometimento de privacidade em massa, manipulação não autorizada de dados.',
  },
  bola: {
    titleSuffix: 'Broken Object Level Authorization (BOLA)',
    severity: 'CRITICA',
    owaspWeb: 'A01:2021 — Broken Access Control',
    owaspApi: 'API1:2023 — Broken Object Level Authorization',
    descricaoTecnica: (alvo) => `${alvo} retorna objetos sem validar ownership. API confia que o ID do objeto na URL é suficiente para autorização, ignorando o user do JWT.`,
    impactoCaixa: 'Listagem ou modificação de transferências PIX e contas alheias. Atacante autenticado como user A acessa recursos de user B.',
    impactoGenerico: 'API expõe dados de qualquer usuário a qualquer outro usuário autenticado.',
    mitigacao: (tipo) => `1. Validação server-side de ownership em todo endpoint que recebe identificador.
2. Query padrão: WHERE id = :id AND user_id = :sub_from_jwt.
3. ASVS V4.1.3 obrigatório.
4. Autorização declarativa: [Authorize] + Resource-based authorization handler.`,
    riscosCaixa: 'Idêntico ao IDOR — risco BACEN/LGPD certo.',
    riscosGenerico: 'Vazamento + manipulação em escala.',
  },
  open_redirect: {
    titleSuffix: 'Open Redirect',
    severity: 'MEDIA',
    owaspWeb: 'A01:2021 — Broken Access Control',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `${alvo} aceita URL controlada pelo cliente no parâmetro de redirect sem validar contra allowlist. Phishing facilitado: link aparenta vir do domínio legítimo mas leva ao site do atacante.`,
    impactoCaixa: 'Phishing direcionado a clientes Caixa: link "caixa.gov.br/redirect?url=caixa-fake.com" parece legítimo no e-mail. Vítima entrega credenciais no site falso.',
    impactoGenerico: 'Phishing usando reputação do domínio vítima, distribuição de malware.',
    mitigacao: (tipo) => `1. Allowlist de URLs permitidas (apenas domínios da própria org).
2. Mapear códigos curtos -> URLs no backend (não passar URL completa no parâmetro).
3. Validar Uri.IsWellFormedUriString + checagem de Host contra allowlist.
4. Em redirects opcionais, prefixar com warning ao usuário ("você está saindo de caixa.gov.br").`,
    riscosCaixa: 'Suporte ao cliente sobrecarregado com vítimas de phishing. Possível obrigação de avisar todos os clientes.',
    riscosGenerico: 'Phishing facilitado, perda de confiança no domínio.',
  },
  ssrf: {
    titleSuffix: 'Server-Side Request Forgery (SSRF)',
    severity: 'CRITICA',
    owaspWeb: 'A10:2021 — Server-Side Request Forgery',
    owaspApi: 'API7:2023 — Server-Side Request Forgery',
    descricaoTecnica: (alvo) => `${alvo} aceita URL controlada pelo cliente e faz fetch server-side. Atacante força o servidor a acessar recursos internos (localhost, AWS metadata 169.254.169.254, serviços internos).`,
    impactoCaixa: 'Acesso a serviços internos da Caixa (intranet, APIs sem auth assumindo same-network), AWS metadata para vazamento de IAM credentials, port scan da rede interna.',
    impactoGenerico: 'Pivoting para rede interna, vazamento de cloud credentials, port scan, ataque a serviços internos vulneráveis.',
    mitigacao: (tipo) => `1. Allowlist de domínios permitidos pra fetch server-side.
2. Bloquear IPs privados (RFC 1918) e link-local (169.254.0.0/16, fe80::/10).
3. Resolver DNS antes do request e validar IP resultante (anti DNS-rebinding).
4. Network policy: serviço só pode sair pela egress gateway, não direto.
5. IMDSv2 (token required) no AWS.`,
    riscosCaixa: 'Comprometimento de infra cloud + acesso a redes segregadas. Ataque a serviços mainframe.',
    riscosGenerico: 'Pivoting completo da infra cloud, vazamento de secrets, lateral movement.',
  },
  rce: {
    titleSuffix: 'Remote Code Execution (RCE)',
    severity: 'CRITICA',
    owaspWeb: 'A03:2021 — Injection',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `Execução de código arbitrário no servidor a partir de input do cliente em ${alvo}. Pode vir via command injection (shell), deserialização insegura, template injection ou file upload com execução.`,
    impactoCaixa: 'Comprometimento total do servidor. Acesso a dados de clientes, chaves criptográficas, código-fonte. Pivoting para infra interna SIACI/mainframe.',
    impactoGenerico: 'Shell remoto, persistência, exfiltração total, ransomware.',
    mitigacao: (tipo) => `1. Nunca passar input do usuário pra Process.Start/exec/eval.
2. Allowlist estrita se precisar executar comandos.
3. Deserialização: usar formatos seguros (JSON com type checking, não BinaryFormatter).
4. Container hardening: read-only filesystem, drop capabilities, no shell na imagem.
5. EDR + monitoring de execução de processo anômala.`,
    riscosCaixa: 'Incidente cibernético crítico. Notificação BACEN imediata. Possível interrupção da operação.',
    riscosGenerico: 'Compromisso total, ransomware, vazamento massivo.',
  },
  lfi: {
    titleSuffix: 'Path Traversal / Local File Inclusion',
    severity: 'ALTA',
    owaspWeb: 'A01:2021 — Broken Access Control',
    owaspApi: 'API3:2023 — Broken Object Property Level Authorization',
    descricaoTecnica: (alvo) => `${alvo} aceita path do arquivo no parâmetro e não sanitiza ../. Payload "../../../../etc/passwd" lê arquivos do servidor.`,
    impactoCaixa: 'Leitura de arquivos de config Caixa (connection strings, secrets), código-fonte da app SIACI, chaves privadas.',
    impactoGenerico: 'Vazamento de arquivos sensíveis do servidor.',
    mitigacao: (tipo) => `1. Path.Combine + Path.GetFullPath, validar que o path resolvido começa com basePath whitelisted.
2. Allowlist de filenames (ex: regex ^[a-zA-Z0-9_-]+\\.(pdf|jpg)$).
3. Servir arquivos via storage S3-like com URLs assinadas, não pelo filesystem direto.
4. Process com permissão mínima de leitura.`,
    riscosCaixa: 'Vazamento de secrets → escalation para outros ataques.',
    riscosGenerico: 'Vazamento de configs e código, escalation.',
  },
  mass_assignment: {
    titleSuffix: 'Mass Assignment',
    severity: 'ALTA',
    owaspWeb: 'A04:2021 — Insecure Design',
    owaspApi: 'API3:2023 — Broken Object Property Level Authorization',
    descricaoTecnica: (alvo) => `${alvo} aceita campos extras no body que não deveriam ser modificáveis pelo cliente (ex: isAdmin, role, balance, owner_id). Escalação de privilégios direta.`,
    impactoCaixa: 'Escalação para perfil ADMIN no SIACI. Modificação de saldos, limites, owner de contas.',
    impactoGenerico: 'Escalação de privilégios, modificação de campos protegidos.',
    mitigacao: (tipo) => `1. DTOs explícitos com APENAS os campos editáveis (allowlist).
2. ASP.NET Core: [Bind(nameof(Field1), nameof(Field2))] ou view models específicos por endpoint.
3. AutoMapper: ForMember(Ignore()) para campos sensíveis.
4. Never bind direto ao Entity Framework entity.`,
    riscosCaixa: 'Tomada de conta administrativa do SIACI. Fraude.',
    riscosGenerico: 'Account takeover, fraud.',
  },
  jwt: {
    titleSuffix: 'JWT Misconfiguration',
    severity: 'CRITICA',
    owaspWeb: 'A07:2021 — Identification and Authentication Failures',
    owaspApi: 'API2:2023 — Broken Authentication',
    descricaoTecnica: (alvo) => `${alvo} aceita JWT com alg=none, ou valida HS256 com chave pública RSA (algorithm confusion), ou não valida aud/iss, ou aceita token expirado. Forge de token possível.`,
    impactoCaixa: 'Forge de token de qualquer usuário Caixa, incluindo admin. Acesso total ao SIACI.',
    impactoGenerico: 'Account takeover total via forge de token.',
    mitigacao: (tipo) => `1. Forçar algoritmo no middleware (não confiar no header alg).
2. Validar issuer, audience, expiration, signature obrigatoriamente.
3. Não usar HS256 com chaves derivadas de pubkey RSA.
4. Tokens de curta duração (15min) + refresh token.
5. Em ASP.NET: AddJwtBearer com TokenValidationParameters completo.`,
    riscosCaixa: 'Compromisso total da autenticação. Notificação BACEN imediata.',
    riscosGenerico: 'Auth bypass total, account takeover em escala.',
  },
  auth_bypass: {
    titleSuffix: 'Authentication Bypass / Weak Auth',
    severity: 'ALTA',
    owaspWeb: 'A07:2021 — Identification and Authentication Failures',
    owaspApi: 'API2:2023 — Broken Authentication',
    descricaoTecnica: (alvo) => `${alvo} permite bypass de autenticação via brute-force sem rate-limit, password reset sem validação, ou uso de credenciais default.`,
    impactoCaixa: 'Credential stuffing em massa contra clientes Caixa. Account takeover.',
    impactoGenerico: 'Comprometimento de contas, credential stuffing.',
    mitigacao: (tipo) => `1. Rate-limit por IP + username com backoff exponencial.
2. Lockout após N falhas (com unlock automático).
3. MFA obrigatório.
4. Detecção de credential stuffing (velocidade, geolocation).
5. Have I Been Pwned API para rejeitar senhas conhecidas.`,
    riscosCaixa: 'Tomada de contas em escala. Reportação BACEN.',
    riscosGenerico: 'Account takeover em massa.',
  },
  generic: {
    titleSuffix: 'Vulnerabilidade identificada — análise detalhada necessária',
    severity: 'MEDIA',
    owaspWeb: 'A04:2021 — Insecure Design',
    owaspApi: 'API8:2023 — Security Misconfiguration',
    descricaoTecnica: (alvo) => `Comportamento anômalo detectado em ${alvo}. Análise manual necessária para classificar vulnerabilidade. Demo provider precisa de mais contexto na descrição (mencione XSS, SQLi, IDOR, etc) para gerar épico específico.`,
    impactoCaixa: 'Impacto a determinar conforme análise manual.',
    impactoGenerico: 'Impacto a determinar.',
    mitigacao: () => 'Análise manual + configure um provider real (GitHub Models/Ollama) em Integrações para análise mais profunda.',
    riscosCaixa: 'A avaliar.',
    riscosGenerico: 'A avaliar.',
  },
};

function demoArchitecture(_userMsg: string) {
  return {
    resumo: 'Arquitetura típica de API bancária com gateway, serviço de negócio e batch COBOL. Principal risco: confiança implícita entre gateway e backend, sem validação de identidade do chamador no serviço interno.',
    componentes: [
      {
        nome: 'API Gateway (WSO2)',
        descricao: 'Ponto de entrada externo, faz auth OAuth2 e rate-limit.',
        ameacas: [
          { stride: 'S', titulo: 'Spoofing de cliente', descricao: 'Atacante usa client_credentials roubadas', mitigacao: 'mTLS + rotação curta' },
          { stride: 'D', titulo: 'DoS via burst', descricao: 'Quota generosa em endpoint caro', mitigacao: 'Rate-limit por endpoint + circuit breaker' },
        ],
      },
      {
        nome: 'Serviço de Transferência (ASP.NET Core)',
        descricao: 'Recebe ordem do gateway e dispatcha pro batch.',
        ameacas: [
          { stride: 'T', titulo: 'Tampering de payload', descricao: 'Gateway confia que payload já foi validado', mitigacao: 'Validar de novo no serviço — defense in depth' },
          { stride: 'E', titulo: 'Elevation via mass assignment', descricao: 'Body aceita campos extras', mitigacao: 'DTOs explícitos + [Bind]' },
        ],
      },
      {
        nome: 'Batch COBOL (Mainframe Z)',
        descricao: 'Liquidação efetiva da transferência.',
        ameacas: [
          { stride: 'R', titulo: 'Repudiation', descricao: 'Sem log de quem originou a operação', mitigacao: 'Propagar correlation_id + user_id no log' },
          { stride: 'I', titulo: 'Info disclosure', descricao: 'Erros COBOL vazam estrutura interna', mitigacao: 'Sanitizar mensagens antes do gateway' },
        ],
      },
    ],
    attackTree: {
      raiz: 'Fraude PIX em massa',
      nos: [
        { id: 'n1', tipo: 'entry', titulo: 'Captura de token via XSS no portal', componente: 'API Gateway', tecnica: 'XSS refletido no parâmetro de busca' },
        { id: 'n2', tipo: 'exploit', titulo: 'Replay de transferência com IDOR', componente: 'Serviço de Transferência', tecnica: 'Trocar account_id no body' },
        { id: 'n3', tipo: 'impact', titulo: 'Liquidação efetiva no batch', componente: 'Batch COBOL', tecnica: 'Batch confia em payload validado pelo serviço' },
      ],
      arestas: [
        { de: 'n1', para: 'n2', como: 'Token roubado usado pra autenticar request manipulado' },
        { de: 'n2', para: 'n3', como: 'Serviço encaminha pro batch sem revalidação' },
      ],
      mitigacaoChave: 'Validação dupla: serviço de transferência re-valida ownership antes de encaminhar pro batch, e batch valida correlation_id assinado.',
    },
    vulnerabilidadesDestaque: [
      { titulo: 'Confiança implícita Gateway → Serviço', componente: 'Serviço de Transferência', severidade: 'CRITICA', descricao: 'Serviço não re-valida ownership/autorização. Atacante que passa pelo gateway tem acesso irrestrito.', owasp: 'API1:2023 BOLA' },
      { titulo: 'Sem rate-limit por endpoint', componente: 'API Gateway', severidade: 'ALTA', descricao: 'Quota global permite burst em endpoint caro (transferência), abrindo DoS + brute-force.', owasp: 'API4:2023' },
      { titulo: 'Correlation_id ausente', componente: 'Batch COBOL', severidade: 'ALTA', descricao: 'Sem propagar correlation_id do request original, impossível auditar ou rastrear fraude.', owasp: 'A09:2021' },
      { titulo: 'Mass Assignment no body', componente: 'Serviço de Transferência', severidade: 'ALTA', descricao: 'Body do POST aceita campos extras (role, isAdmin, balance), permitindo escalação.', owasp: 'API3:2023' },
      { titulo: 'Erros COBOL vazam estrutura', componente: 'Batch COBOL', severidade: 'MEDIA', descricao: 'Mensagens de erro do COBOL chegam ao cliente expondo nomes de campos internos.', owasp: 'A05:2021' },
    ],
    mitigacoesPrioritarias: [
      { titulo: 'Re-validar ownership no Serviço', componente: 'Serviço de Transferência', esforco: 'BAIXO', impacto: 'ALTO', comoFazer: 'Em todo handler que recebe ID, fazer SELECT WHERE id=:id AND owner=:user_jwt. ASVS V4.1.3.' },
      { titulo: 'DTOs explícitos com [Bind]', componente: 'Serviço de Transferência', esforco: 'BAIXO', impacto: 'ALTO', comoFazer: 'Criar TransferenciaInputDto só com campos editáveis. Usar [Bind(nameof(...))] em ASP.NET Core.' },
      { titulo: 'Rate-limit por endpoint', componente: 'API Gateway', esforco: 'MEDIO', impacto: 'ALTO', comoFazer: 'WSO2 throttling policies: 100req/min em /transferencia, 1000req/min em /consulta. Circuit breaker.' },
      { titulo: 'Correlation_id assinado', componente: 'Gateway + Serviço + COBOL', esforco: 'MEDIO', impacto: 'ALTO', comoFazer: 'Gateway gera UUID + HMAC, propaga em X-Correlation-ID. Serviço valida assinatura, COBOL loga.' },
      { titulo: 'Sanitizar erros COBOL', componente: 'API Gateway', esforco: 'BAIXO', impacto: 'MEDIO', comoFazer: 'Gateway intercepta response 5xx do batch, devolve mensagem genérica + correlation_id. Log detalhado fica server-side.' },
    ],
    dicas: [
      'Defense in depth: cada camada (gateway, serviço, batch) re-valida independente. Não confie no anterior.',
      'Use mTLS entre gateway e serviços internos — bloqueia atacante mesmo se entrar na rede.',
      'Log estruturado com correlation_id em TODAS as camadas é mais valioso pra forensics que qualquer ferramenta cara.',
      'Em multi-tenant, inclua tenant_id em TODA query — esquecer 1 endpoint = vazamento cross-tenant.',
      'Threat model na revisão de design, não depois do deploy. Catch bugs antes de virar incidente.',
      'Pra Caixa: alinhe modelo de ameaças com BACEN Res. 4658 + LGPD desde o design — facilita auditoria.',
    ],
  };
}

function demoAnalysis() {
  return {
    resumoExecutivo: 'O portfólio SIACI apresenta 37 vulnerabilidades ativas (6 críticas), risk score 64/100. MTTR médio de 14 dias está acima do alvo de 10 dias para críticas. Squad NM182 concentra 40% do backlog crítico.',
    fortaleza: 'Squad NM181 (Evolução) com MTTR de 4d e 100% SLA compliance. NM176 (Recursos) sem vulnerabilidades críticas há 60 dias.',
    fraqueza: '6 vulnerabilidades CRÍTICAS abertas em ativos HIGH/CRITICAL. SLA de críticas vencido em 4 casos. Squad NM182 com MTTR de 22d.',
    acao: '1. NM182 corrigir VUL-CXA-0381 (BOLA em /transferencias) em 5d.\n2. NM177 mitigar VUL-CXA-0394 (SQL injection em /pix/cancelar) em 3d.\n3. Revisar política SLA — críticas devem ter prazo de 7d, não 14d.',
    topVulnerabilities: [
      { codigo: 'VUL-CXA-0381', motivo: 'BOLA permite acesso a transferências de outros clientes', ativoAfetado: 'siaci-originacao-api', diasAberto: 22 },
      { codigo: 'VUL-CXA-0394', motivo: 'SQLi blind no endpoint de cancelamento PIX', ativoAfetado: 'siaci-financeiro-api', diasAberto: 8 },
      { codigo: 'VUL-CXA-0402', motivo: 'Hardcoded secret no bundle JS público', ativoAfetado: 'siaci-portal-publico', diasAberto: 15 },
    ],
    maturidadeGaps: [
      { squad: 'NM182 - Originação e Entrada de Dados - SIACI', gap: 'MTTR 22d acima do alvo de 10d, reincidência de IDOR em 3 sprints', lider: 'João Silva', mttr: 22, slaCompliance: 65 },
      { squad: 'NM177 - Financeiro e Garantias - SIACI', gap: 'SLA compliance 78%, 2 críticas SLA-breach', lider: 'Maria Santos', mttr: 16, slaCompliance: 78 },
    ],
    projecaoRisco: {
      dias30: 'Mantendo taxa atual (52% de correção em 30d), backlog cresce 12 vulnerabilidades. 2 críticas vão entrar em SLA-breach (BACEN exposure).',
      dias90: 'Sem intervenção, risk score sobe pra 78/100. Risco regulatório alto se incidente PIX for reportado. Reduzir backlog de críticas em 50% até dia 60.',
    },
    culturaInsights: 'Squad NM181 demonstra maturidade DevSecOps superior (MTTR 4d, zero reincidência). Boas práticas dela podem ser pattern: code review obrigatório com checklist SDL, threat modeling em design, testes de segurança em CI.',
    evolucao: [
      { mes: 'Jan', fechadas: 18, abertas: 12 },
      { mes: 'Fev', fechadas: 22, abertas: 15 },
      { mes: 'Mar', fechadas: 19, abertas: 11 },
      { mes: 'Abr', fechadas: 25, abertas: 18 },
      { mes: 'Mai', fechadas: 21, abertas: 14 },
    ],
    attackPath: [
      { node: 'BOLA em /transferencias (VUL-CXA-0381)', escalatesTo: 'Acesso a transferências de outros clientes' },
      { node: 'SQLi em /pix/cancelar (VUL-CXA-0394)', escalatesTo: 'Cancelamento massivo + extração de dados' },
      { node: 'Hardcoded secret no bundle JS (VUL-CXA-0402)', escalatesTo: 'Comprometimento da chave de assinatura interna' },
    ],
  };
}

// ===== Forge demo =====
function demoForge(userMsg: string) {
  const isCobol = /cobol|identification\s+division|procedure\s+division/i.test(userMsg);
  const isWebForms = /<asp:|runat="server"|<%@\s*page/i.test(userMsg);

  if (isCobol) {
    return {
      detectedLang: 'cobol',
      targetFramework: 'aspnet-core-8',
      modernizedCode: "```csharp\n// Equivalente moderno do batch COBOL recebido\nusing Microsoft.EntityFrameworkCore;\n\npublic record TransferenciaRequest(string ContaOrigem, string ContaDestino, decimal Valor);\n\n[ApiController]\n[Route(\"api/transferencias\")]\npublic class TransferenciaController(SiaciDbContext db, ILogger<TransferenciaController> log) : ControllerBase\n{\n    [HttpPost]\n    [Authorize(Policy = \"TransferenciaScope\")]\n    public async Task<IActionResult> Executar([FromBody] TransferenciaRequest req, CancellationToken ct)\n    {\n        if (req.Valor <= 0) return ValidationProblem(\"Valor inválido\");\n        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);\n        await using var tx = await db.Database.BeginTransactionAsync(ct);\n        var origem = await db.Contas\n            .FirstOrDefaultAsync(c => c.Numero == req.ContaOrigem && c.TitularId == userId, ct);\n        if (origem is null) return Forbid();\n        if (origem.Saldo < req.Valor) return ValidationProblem(\"Saldo insuficiente\");\n        var destino = await db.Contas.FirstOrDefaultAsync(c => c.Numero == req.ContaDestino, ct);\n        if (destino is null) return NotFound();\n        origem.Saldo -= req.Valor;\n        destino.Saldo += req.Valor;\n        db.Movimentos.Add(new Movimento(req.ContaOrigem, req.ContaDestino, req.Valor, DateTimeOffset.UtcNow));\n        await db.SaveChangesAsync(ct);\n        await tx.CommitAsync(ct);\n        log.LogInformation(\"Transferencia {Valor} {O}->{D} user={U}\", req.Valor, req.ContaOrigem, req.ContaDestino, userId);\n        return Ok(new { status = \"ok\" });\n    }\n}\n```",
      unitTests: "```csharp\nusing Xunit;\nusing Microsoft.EntityFrameworkCore;\n\npublic class TransferenciaControllerTests\n{\n    private SiaciDbContext NewDb() => new(new DbContextOptionsBuilder<SiaciDbContext>()\n        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);\n\n    [Fact]\n    public async Task Transferencia_Sucesso_DebitaECredita()\n    {\n        var db = NewDb();\n        db.Contas.Add(new Conta(\"A\", \"u1\", 1000m));\n        db.Contas.Add(new Conta(\"B\", \"u2\", 0m));\n        await db.SaveChangesAsync();\n        var ctrl = NewControllerComUsuario(db, \"u1\");\n        var r = await ctrl.Executar(new TransferenciaRequest(\"A\", \"B\", 100m), CancellationToken.None);\n        Assert.IsType<OkObjectResult>(r);\n        Assert.Equal(900m, db.Contas.Single(c => c.Numero == \"A\").Saldo);\n    }\n\n    [Fact]\n    public async Task Transferencia_ContaDeOutroDono_RetornaForbid()\n    {\n        var db = NewDb();\n        db.Contas.Add(new Conta(\"A\", \"u-outro\", 1000m));\n        await db.SaveChangesAsync();\n        var ctrl = NewControllerComUsuario(db, \"u1\");\n        var r = await ctrl.Executar(new TransferenciaRequest(\"A\", \"B\", 100m), CancellationToken.None);\n        Assert.IsType<ForbidResult>(r);\n    }\n\n    [Fact]\n    public async Task Transferencia_SaldoInsuficiente_ValidationProblem()\n    {\n        var db = NewDb();\n        db.Contas.Add(new Conta(\"A\", \"u1\", 10m));\n        await db.SaveChangesAsync();\n        var ctrl = NewControllerComUsuario(db, \"u1\");\n        var r = await ctrl.Executar(new TransferenciaRequest(\"A\", \"B\", 100m), CancellationToken.None);\n        Assert.IsType<ObjectResult>(r);\n    }\n}\n```",
      securityDiff: [
        { type: 'fixed', title: 'Ownership check ausente no COBOL', legacyPattern: 'Sem validação de titular da conta', modernPattern: 'Filtro WHERE TitularId == userId via EF Core', owasp: 'API1:2023', cwe: 'CWE-639', description: 'Endpoint moderno valida que a conta origem pertence ao usuário do JWT. Bloqueia BOLA.' },
        { type: 'fixed', title: 'Concorrência sem transação atômica', legacyPattern: 'Updates seriais em batch COBOL sem locking', modernPattern: 'BeginTransaction + SaveChanges + Commit', owasp: 'A04:2021', cwe: 'CWE-362', description: 'Operação encapsulada em transação. Falha em qualquer etapa faz rollback completo.' },
        { type: 'fixed', title: 'Log estruturado com correlation', legacyPattern: 'PRINT/DISPLAY sem contexto', modernPattern: 'ILogger structured logging', owasp: 'A09:2021', cwe: 'CWE-778', description: 'Cada operação registra valor, contas e user. Auditoria completa.' },
        { type: 'attention', title: 'Validação de limite diário não migrada', legacyPattern: 'Possivelmente em outro programa COBOL', modernPattern: 'TODO Caixa-specific', description: 'Lógica de limite diário PIX precisa ser portada do batch original — não visível no snippet recebido.' },
      ],
      refactoringMap: [
        { section: 'Acesso a dados', legacyApproach: 'EXEC SQL com binding posicional', modernApproach: 'Entity Framework Core com LINQ parametrizado', sdlControl: 'SDL-CIWEB #14 SQL Injection', rationale: 'Prepared statements implícitos, query intelligence + tracing.' },
        { section: 'Autorização', legacyApproach: 'Ausente (confiava na invocação batch)', modernApproach: 'Policy "TransferenciaScope" + ownership check no DB', sdlControl: 'SDL-CIWEB #22 BAC + ASVS V4.1.3', rationale: 'API exposta requer authz formal.' },
        { section: 'Tratamento de erro', legacyApproach: 'ABEND ou DISPLAY de mensagem', modernApproach: 'ValidationProblem / NotFound / Forbid (ProblemDetails)', sdlControl: 'SDL-CIWEB #41 Error Handling', rationale: 'Resposta estruturada sem vazar internals.' },
        { section: 'Observabilidade', legacyApproach: 'Sem log de operação', modernApproach: 'ILogger structured + correlation id', sdlControl: 'SDL-CIWEB #38 Logging', rationale: 'BACEN 4658 exige rastreabilidade.' },
      ],
      caveats: [
        'Conexão COBOL → CICS não foi migrada. Se a transferência originalmente disparava CICS, manter integração via gateway.',
        'Limite diário PIX precisa ser portado de outro módulo COBOL.',
        'Schema do EF Core assume tabelas Contas/Movimentos — validar migrations contra DB2 → PostgreSQL.',
      ],
      reviewChecklist: [
        'Conferir mapping Conta.TitularId vs claim ClaimTypes.NameIdentifier (subject do JWT)',
        'Validar políticas de autorização registradas no Program.cs',
        'Cobertura de testes para concorrência (transferência simultânea)',
        'Métricas de latência vs batch COBOL original',
        'Compliance BACEN 4658 com logs estruturados',
      ],
    };
  }

  if (isWebForms) {
    return {
      detectedLang: 'webforms',
      targetFramework: 'aspnet-core-8',
      modernizedCode: "```csharp\n// WebForms aspx postback → Minimal API + Razor Page\nusing Microsoft.AspNetCore.Antiforgery;\n\nvar builder = WebApplication.CreateBuilder(args);\nbuilder.Services.AddAntiforgery();\nbuilder.Services.AddRazorPages();\nbuilder.Services.AddDbContext<SiaciDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString(\"db\")));\nvar app = builder.Build();\napp.UseAntiforgery();\napp.MapRazorPages();\napp.MapPost(\"/contato\", async (HttpContext ctx, IAntiforgery af, ContatoForm f, SiaciDbContext db) =>\n{\n    await af.ValidateRequestAsync(ctx);\n    if (string.IsNullOrWhiteSpace(f.Nome) || string.IsNullOrWhiteSpace(f.Email))\n        return Results.ValidationProblem(new Dictionary<string,string[]>{{ \"campo\", new[]{ \"obrigatório\" } }});\n    db.Contatos.Add(new Contato(f.Nome, f.Email, f.Mensagem));\n    await db.SaveChangesAsync();\n    return Results.Ok(new { id = db.Contatos.Local.First().Id });\n});\napp.Run();\n```",
      unitTests: "```csharp\nusing Xunit;\nusing Microsoft.AspNetCore.Mvc.Testing;\n\npublic class ContatoEndpointTests(WebApplicationFactory<Program> fixture) : IClassFixture<WebApplicationFactory<Program>>\n{\n    private readonly HttpClient _client = fixture.CreateClient();\n\n    [Fact]\n    public async Task Post_SemAntiforgery_400()\n    {\n        var r = await _client.PostAsJsonAsync(\"/contato\", new ContatoForm(\"a\", \"b\", \"c\"));\n        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);\n    }\n\n    [Fact]\n    public async Task Post_CamposVazios_ValidationProblem()\n    {\n        var r = await _client.PostAsJsonAsync(\"/contato\", new ContatoForm(\"\", \"\", \"\"));\n        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);\n    }\n}\n```",
      securityDiff: [
        { type: 'fixed', title: 'ViewState desabilitado', legacyPattern: 'ViewState binário deserializado client-side', modernPattern: 'Razor Pages stateless + antiforgery token', owasp: 'A08:2021', cwe: 'CWE-502', description: 'Elimina superfície de deserialização insegura.' },
        { type: 'fixed', title: 'CSRF token automático', legacyPattern: 'Postback sem CSRF token', modernPattern: 'AddAntiforgery + ValidateRequestAsync', owasp: 'A01:2021', cwe: 'CWE-352', description: 'Token validado em todo POST.' },
        { type: 'fixed', title: 'Response.Write substituído por encoding contextual', legacyPattern: 'Response.Write(input)', modernPattern: 'Razor @Variable (auto-encoda)', owasp: 'A03:2021', cwe: 'CWE-79', description: 'Razor encoda HTML por padrão.' },
        { type: 'attention', title: 'Lógica de sessão WebForms', legacyPattern: 'Session["chave"] espalhado', modernPattern: 'IHttpContextAccessor + DI', description: 'Refatorar para serviços scoped — não usar HttpContext.Current.' },
      ],
      refactoringMap: [
        { section: 'Render pipeline', legacyApproach: 'WebForms control tree + postback', modernApproach: 'Razor Pages stateless', sdlControl: 'SDL-CIWEB #45 Architecture', rationale: 'Modelo mais simples e testável.' },
        { section: 'CSRF', legacyApproach: 'ViewStateUserKey opcional', modernApproach: 'IAntiforgery obrigatório', sdlControl: 'SDL-CIWEB #21 CSRF', rationale: 'Token validado server-side.' },
        { section: 'Encoding', legacyApproach: 'Response.Write sem encoding', modernApproach: 'Razor @ auto-encoda', sdlControl: 'SDL-CIWEB #18 Output Encoding', rationale: 'Defesa default contra XSS.' },
      ],
      caveats: [
        'Master pages → Layout Razor; convertam manualmente.',
        'WebForms event handlers (Page_Load, btn_Click) → minimal API handlers.',
        'GridView/Repeater → componentes Razor ou Blazor.',
      ],
      reviewChecklist: [
        'Conferir mapeamento Page_Load → endpoint',
        'CSP estrita após remoção do ViewState',
        'Migrar binding de Session pra serviços scoped',
        'Cobertura de testes de integração',
      ],
    };
  }

  // Generic ASP.NET Framework → Core
  return {
    detectedLang: 'aspnet-framework',
    targetFramework: 'aspnet-core-8',
    modernizedCode: "```csharp\n// ASP.NET 4.x Controller → ASP.NET Core 8 Minimal API\nusing Microsoft.EntityFrameworkCore;\n\nvar builder = WebApplication.CreateBuilder(args);\nbuilder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();\nbuilder.Services.AddAuthorization();\nbuilder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString(\"db\")));\nvar app = builder.Build();\napp.UseAuthentication();\napp.UseAuthorization();\napp.MapGet(\"/api/transferencias/{id:guid}\", async (Guid id, ClaimsPrincipal user, AppDb db) =>\n{\n    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);\n    var t = await db.Transferencias.FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == userId);\n    return t is null ? Results.NotFound() : Results.Ok(t);\n}).RequireAuthorization();\napp.Run();\n```",
    unitTests: "```csharp\nusing Xunit;\nusing Microsoft.AspNetCore.Mvc.Testing;\n\npublic class TransferenciaEndpointTests(WebApplicationFactory<Program> fx) : IClassFixture<WebApplicationFactory<Program>>\n{\n    [Fact]\n    public async Task Get_SemToken_401()\n    {\n        var c = fx.CreateClient();\n        var r = await c.GetAsync(\"/api/transferencias/00000000-0000-0000-0000-000000000001\");\n        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);\n    }\n}\n```",
    securityDiff: [
      { type: 'fixed', title: 'JWT validação completa', legacyPattern: 'OAuthBearerAuthentication com defaults', modernPattern: 'AddJwtBearer + TokenValidationParameters', owasp: 'A02:2021', cwe: 'CWE-287', description: 'Issuer/audience/expiration/alg fixos.' },
      { type: 'fixed', title: 'Ownership check via JWT', legacyPattern: 'Confiava no ID da URL', modernPattern: 'Filtro x.UsuarioId == userId', owasp: 'A01:2021', cwe: 'CWE-639', description: 'Bloqueia BOLA.' },
      { type: 'attention', title: 'CORS policy', legacyPattern: 'EnableCors em todo endpoint', modernPattern: 'AddCors policy nomeada', description: 'Configurar allowlist explícita.' },
    ],
    refactoringMap: [
      { section: 'Stack', legacyApproach: 'IIS + System.Web', modernApproach: 'Kestrel + Microsoft.AspNetCore', sdlControl: 'SDL-CIWEB #45 Architecture', rationale: 'Cross-platform, perf, DI nativo.' },
      { section: 'Autenticação', legacyApproach: 'Owin middlewares', modernApproach: 'AddAuthentication().AddJwtBearer()', sdlControl: 'SDL-CIWEB #23 Auth', rationale: 'API moderna + claims-based.' },
    ],
    caveats: ['Web.config → appsettings.json + Configuration', 'HttpModules → middlewares', 'Global.asax → Program.cs + minimal hosting'],
    reviewChecklist: ['Conferir matching de claims', 'Migrar custom HttpModules', 'Validar políticas de autorização', 'Cobrir tests de integração'],
  };
}

// ===== Mirror demo =====
function demoMirror(systemPrompt: string, userMessage: string) {
  const fwMatch = systemPrompt.match(/FRAMEWORK SELECIONADO:\s*(\w+)/i);
  const framework = (fwMatch?.[1] || 'STRIDE').toLowerCase();

  const componentes = [
    {
      nome: 'API Gateway WSO2',
      descricao: 'Entry point externo, OAuth2 + rate-limit.',
      ameacas: [
        framework === 'linddun'
          ? { categoria: 'I', titulo: 'Identifiability via JWT', descricao: 'sub claim com CPF facilita re-identificação.', mitigacao: 'Usar UUID opaco como sub, mapear pra CPF server-side.', referencia: 'LGPD Art. 13' }
          : framework === 'pasta'
          ? { categoria: 'Business', titulo: 'Quota generosa permite fraude PIX em escala', descricao: 'Rate-limit global, sem cap por endpoint sensível.', mitigacao: 'Throttling por endpoint + circuit breaker.', referencia: 'RAG#1' }
          : { categoria: 'S', titulo: 'Spoofing client_credentials', descricao: 'client_credentials roubadas viram acesso total.', mitigacao: 'mTLS + rotação curta.', referencia: 'RAG#1' },
      ],
    },
    {
      nome: 'Serviço de Transferência ASP.NET Core',
      descricao: 'Lógica de negócio PIX/TED.',
      ameacas: [
        framework === 'linddun'
          ? { categoria: 'D', titulo: 'Disclosure em logs estruturados', descricao: 'Log inclui valor e contas — agregação leva a profiling.', mitigacao: 'Mascarar conta destino + redaction em sink.', referencia: 'LGPD Art. 46' }
          : framework === 'pasta'
          ? { categoria: 'Technical', titulo: 'BOLA permite acesso cruzado de contas', descricao: 'Endpoint não valida ownership.', mitigacao: 'WHERE id = :id AND owner = :sub.', referencia: 'ASVS V4.1.3' }
          : { categoria: 'E', titulo: 'Elevation via mass assignment', descricao: 'Body POST aceita campos extras (role, balance).', mitigacao: 'DTO explícito + [Bind(nameof(...))].', referencia: 'ASVS V13.1.3' },
      ],
    },
    {
      nome: 'Batch COBOL Mainframe Z',
      descricao: 'Liquidação financeira.',
      ameacas: [
        framework === 'linddun'
          ? { categoria: 'N', titulo: 'Non-repudiation falha sem correlation_id', descricao: 'Impossível provar autoria.', mitigacao: 'Propagar correlation_id assinado.', referencia: 'LGPD Art. 37' }
          : framework === 'pasta'
          ? { categoria: 'Operational', titulo: 'Sem allowlist de chamadores', descricao: 'Qualquer serviço da rede chama o batch.', mitigacao: 'Network policy + mTLS.', referencia: 'RAG#3' }
          : { categoria: 'R', titulo: 'Repudiation sem log de origem', descricao: 'Sem correlation_id, fraude vira "alguém fez".', mitigacao: 'Propagar correlation_id e user_id.', referencia: 'RAG#2' },
      ],
    },
  ];

  const conformidade = framework === 'linddun'
    ? [
        { norma: 'LGPD', requisito: 'Art. 6 — finalidade e necessidade', aderencia: 'PARCIAL', evidencia: 'Coleta de dados além do estritamente necessário.' },
        { norma: 'LGPD', requisito: 'Art. 46 — segurança', aderencia: 'GAP', evidencia: 'Logs incluem dados pessoais sem mascaramento.' },
      ]
    : [
        { norma: 'BACEN 4658', requisito: 'Política de cibersegurança e gestão de incidente', aderencia: 'PARCIAL', evidencia: 'Plano formal existe; rastreabilidade entre camadas frágil.' },
        { norma: 'OWASP ASVS', requisito: 'V4 — Access Control', aderencia: 'GAP', evidencia: 'BOLA presente, ownership não validado server-side.' },
      ];

  return {
    framework,
    resumo: `Arquitetura típica bancária analisada com ${framework.toUpperCase()}. Principal risco: confiança implícita entre camadas (Gateway → Serviço → Batch) sem revalidação independente.`,
    componentes,
    attackTree: {
      raiz: 'Fraude PIX em massa',
      nos: [
        { id: 'n1', tipo: 'entry', titulo: 'XSS captura token do portal', componente: 'API Gateway WSO2', tecnica: 'XSS refletido no parâmetro de busca' },
        { id: 'n2', tipo: 'exploit', titulo: 'BOLA replay com token roubado', componente: 'Serviço de Transferência', tecnica: 'Trocar account_id no body' },
        { id: 'n3', tipo: 'impact', titulo: 'Liquidação efetivada no batch', componente: 'Batch COBOL Mainframe Z', tecnica: 'Batch confia em payload validado pelo serviço' },
      ],
      arestas: [
        { de: 'n1', para: 'n2', como: 'Token roubado usado pra autenticar request manipulado' },
        { de: 'n2', para: 'n3', como: 'Serviço encaminha pro batch sem revalidação' },
      ],
      mitigacaoChave: 'Validação dupla: serviço re-valida ownership antes de encaminhar pro batch; batch valida correlation_id assinado.',
    },
    mitigacoesPrioritarias: [
      { titulo: 'Re-validar ownership no Serviço', componente: 'Serviço de Transferência', esforco: 'BAIXO', impacto: 'ALTO', comoFazer: 'SELECT WHERE id=:id AND owner=:user_jwt.', referencia: 'ASVS V4.1.3' },
      { titulo: 'Correlation_id assinado', componente: 'Gateway + Serviço + COBOL', esforco: 'MEDIO', impacto: 'ALTO', comoFazer: 'Gateway gera UUID+HMAC, propaga X-Correlation-ID.', referencia: 'RAG#2' },
      { titulo: 'DTOs explícitos com [Bind]', componente: 'Serviço de Transferência', esforco: 'BAIXO', impacto: 'ALTO', comoFazer: 'TransferenciaInputDto apenas com campos editáveis.', referencia: 'ASVS V13.1.3' },
    ],
    conformidade,
  };
}

// ===== Audit demo =====
function demoAudit(_systemPrompt: string, _userMessage: string) {
  return {
    resumo: {
      totalControles: 52,
      ok: 28,
      parcial: 11,
      gap: 9,
      naoAplicavel: 4,
      scoreAderencia: 68,
    },
    porNorma: {
      'LGPD': { total: 12, gaps: 3, aderencia: 67 },
      'BACEN-4658': { total: 9, gaps: 2, aderencia: 71 },
      'SDL-CIWEB': { total: 52, gaps: 9, aderencia: 73 },
    },
    findings: [
      {
        controle: 'Validação server-side de ownership (BOLA)',
        norma: 'SDL-CIWEB',
        artigo: '#22 Broken Access Control',
        status: 'GAP',
        evidencia: '3 vulnerabilidades CRITICAS ativas relacionadas a IDOR/BOLA em /transferencias.',
        vulnsRelacionadas: ['VUL-CXA-0381', 'VUL-CXA-0402'],
        ativosAfetados: ['siaci-originacao-api'],
        severidade: 'CRITICA',
        remediacao: 'Implementar filtro WHERE owner = :user em todo endpoint que recebe ID. Code review obrigatório.',
        prazoSugerido: '7d',
      },
      {
        controle: 'Anonimização e mascaramento de dados pessoais em logs',
        norma: 'LGPD',
        artigo: 'Art. 46',
        status: 'PARCIAL',
        evidencia: 'Logs estruturados em uso porém payload de transferência aparece sem máscara.',
        vulnsRelacionadas: ['VUL-CXA-0388'],
        ativosAfetados: ['siaci-financeiro-api'],
        severidade: 'ALTA',
        remediacao: 'Adicionar sink redactor: mascarar conta destino e CPF antes de gravar.',
        prazoSugerido: '30d',
      },
      {
        controle: 'Plano de resposta a incidente cibernético',
        norma: 'BACEN-4658',
        artigo: 'Art. 6 §1',
        status: 'OK',
        evidencia: 'Documento formal existe e foi atualizado em 2026-04-12.',
        vulnsRelacionadas: [],
        ativosAfetados: [],
        severidade: 'BAIXA',
        remediacao: 'Manter ciclo anual de revisão e drill semestral.',
        prazoSugerido: '90d',
      },
      {
        controle: 'Notificação ANPD em até 72h em caso de incidente',
        norma: 'LGPD',
        artigo: 'Art. 48',
        status: 'PARCIAL',
        evidencia: 'Processo descrito mas sem playbook automatizado de detecção.',
        vulnsRelacionadas: [],
        ativosAfetados: [],
        severidade: 'MEDIA',
        remediacao: 'Integrar SIEM com triagem automática de incidente envolvendo dados pessoais.',
        prazoSugerido: '90d',
      },
      {
        controle: 'JWT validation completa (issuer/aud/exp/alg fixed)',
        norma: 'SDL-CIWEB',
        artigo: '#23 Authentication',
        status: 'GAP',
        evidencia: 'JWT em /pix/cancelar não valida aud nem issuer corretamente (VUL-CXA-0394).',
        vulnsRelacionadas: ['VUL-CXA-0394'],
        ativosAfetados: ['siaci-financeiro-api'],
        severidade: 'CRITICA',
        remediacao: 'AddJwtBearer com TokenValidationParameters completo + ValidAlgorithms fixo.',
        prazoSugerido: '7d',
      },
    ],
    riscosCriticos: [
      {
        titulo: 'BOLA persistente em /transferencias',
        descricao: 'Permite acesso cruzado entre contas. 22 dias em aberto.',
        impactoRegulatorio: 'LGPD Art. 46 + BACEN Res. 4658 — reportação obrigatória em caso de incidente.',
      },
      {
        titulo: 'JWT vulnerável a algorithm confusion',
        descricao: 'Validação fraca permite forge.',
        impactoRegulatorio: 'BACEN Res. 4658 — comprometimento total da autenticação.',
      },
    ],
    planoRemediacao: [
      { ordem: 1, titulo: 'Corrigir BOLA em /transferencias', controle: 'SDL #22 BAC', norma: 'SDL-CIWEB', responsavel: 'NM182 - Originação', prazo: '7d', esforco: 'BAIXO', impacto: 'ALTO' },
      { ordem: 2, titulo: 'Hardening JWT validation', controle: 'SDL #23 Auth', norma: 'SDL-CIWEB', responsavel: 'NM177 - Financeiro', prazo: '7d', esforco: 'BAIXO', impacto: 'ALTO' },
      { ordem: 3, titulo: 'Mascarar dados pessoais em logs', controle: 'LGPD Art. 46', norma: 'LGPD', responsavel: 'Plataforma', prazo: '30d', esforco: 'MEDIO', impacto: 'ALTO' },
      { ordem: 4, titulo: 'Playbook automatizado notificação ANPD', controle: 'LGPD Art. 48', norma: 'LGPD', responsavel: 'SOC + DPO', prazo: '90d', esforco: 'ALTO', impacto: 'MEDIO' },
    ],
    rotuloAI: 'Content Created By/With Use of AI — Audit Skill · demo · ' + new Date().toISOString().slice(0, 10),
  };
}

function demoAttackGraph() {
  return {
    scenarios: [
      {
        id: 'scenario-1',
        title: 'Fraude PIX via BOLA + JWT replay',
        asset: 'siaci-financeiro-api',
        squad: 'NM177 - Financeiro e Garantias - SIACI',
        riskLevel: 'CRITICO',
        impactCategory: 'Fraude Financeira',
        description: 'Atacante combina BOLA em /transferencias com JWT replay para realizar transferências PIX entre contas de outros clientes.',
        nodes: [
          { id: 'n1', vulnKey: 'VUL-CXA-0381', label: 'BOLA em /transferencias', type: 'entry', criticidade: 'CRITICA' },
          { id: 'n2', vulnKey: 'VUL-CXA-0388', label: 'JWT sem aud validation', type: 'exploit', criticidade: 'ALTA' },
          { id: 'n3', vulnKey: null, label: 'Fraude Financeira', type: 'impact', criticidade: null },
        ],
        edges: [
          { source: 'n1', target: 'n2', label: 'Usa token de outro serviço pra acessar conta alheia' },
          { source: 'n2', target: 'n3', label: 'Liquidação PIX automática completa a fraude' },
        ],
        recommendation: 'Corrigir BOLA validando ownership no backend + adicionar aud validation no JWT middleware.',
      },
    ],
  };
}
