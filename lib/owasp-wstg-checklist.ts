/**
 * Checklist consolidado pro contexto Caixa/Unisys.
 * Cada item carrega `scope` (web | api | both) — filtros respeitam.
 * Base: OWASP WSTG v4.2 + OWASP API Top 10 2023 + extensões Caixa.
 */

export type Scope = "web" | "api" | "both"

export interface ChecklistItem {
  id: string
  text: string
  scope: Scope
  ref?: string // OWASP ID / CWE / ASVS
}

export interface ChecklistSection {
  id: string
  category: string
  title: string
  items: ChecklistItem[]
}

const w = (id: string, text: string, ref?: string): ChecklistItem => ({ id, text, scope: "web", ref })
const a = (id: string, text: string, ref?: string): ChecklistItem => ({ id, text, scope: "api", ref })
const b = (id: string, text: string, ref?: string): ChecklistItem => ({ id, text, scope: "both", ref })

export const OWASP_WSTG: ChecklistSection[] = [
  {
    id: "info-gathering",
    category: "INFORMATION GATHERING",
    title: "Reconhecimento",
    items: [
      b("ig-osint", "Google Dorks + OSINT do alvo (site:, inurl:, intitle:, ext:)"),
      b("ig-fingerprint", "Fingerprint do server (banner, headers, response patterns)"),
      w("ig-metafiles", "Inspecionar robots.txt, sitemap.xml, .well-known/, humans.txt"),
      b("ig-leaks", "Buscar .git/, .env, .DS_Store, .svn/ expostos"),
      b("ig-dns", "DNS lookup + reverse DNS + subdomain enum (subfinder, amass)"),
      w("ig-source", "Revisar HTML source code por segredos, comentários, chaves"),
      b("ig-js", "JS recon — JSHunter / LinkFinder pra extrair endpoints e secrets"),
      w("ig-entry", "Mapear pontos de entrada (forms, query strings, headers)"),
      w("ig-paths", "Dirsearch / Gobuster / ffuf pra paths ocultos"),
      a("ig-api-spec", "Buscar /openapi.json, /swagger.json, /swagger-ui, /api/docs, /graphql"),
      a("ig-api-versions", "Enumerar versões antigas da API (/v1, /v2, /api/v1)"),
      b("ig-wapp", "Wappalyzer + Whatweb — identificar stack (ASP.NET, COBOL, WSO2)"),
      b("ig-headers", "Análise de cabeçalhos HTTP (securityheaders.com)"),
      b("ig-cve", "Correlacionar versões detectadas com CVEs conhecidas (NVD, ExploitDB)"),
    ],
  },
  {
    id: "config",
    category: "CONFIGURATION & DEPLOYMENT",
    title: "Configuração & Deploy",
    items: [
      b("cf-network", "Configuração de rede, portas abertas (nmap), credenciais padrão"),
      b("cf-modules", "Só módulos necessários habilitados"),
      b("cf-errors", "Tratamento de erros 4xx/5xx — não vazar stack trace em prod", "A05:2021"),
      b("cf-logs", "Logs não expõem dados sensíveis (PII, tokens, senhas)"),
      w("cf-extensions", "Servidor rejeita extensões maliciosas (.bak, .config, .old, .swp)"),
      b("cf-backup", "Backups não-referenciados não expostos"),
      b("cf-admin", "Interfaces administrativas com auth forte ou isoladas em VPN"),
      b("cf-methods", "PUT, DELETE, OPTIONS, TRACE desabilitados se não usados"),
      b("cf-hsts", "HSTS habilitado (Strict-Transport-Security)"),
      b("cf-cors", "CORS policy não usa Allow-Origin: * com credentials"),
      b("cf-subdomain", "Subdomain takeover (CNAME dangling em GitHub Pages, Heroku, Azure)"),
      b("cf-cloud", "Buckets S3/Azure Blob/GCS públicos (sensitive paths)"),
      a("cf-api-gateway", "WSO2 / API Gateway: rate-limit por endpoint, quotas, throttling"),
      a("cf-api-cache", "Cache invalidation correta (não cachear responses com dados sensíveis)"),
    ],
  },
  {
    id: "identity",
    category: "IDENTITY MANAGEMENT",
    title: "Identidade",
    items: [
      b("id-roles", "Forced browsing — user comum acessa endpoints admin?"),
      b("id-idor", "IDOR — troca de IDs sequenciais retorna recursos de outros users", "A01:2021"),
      b("id-tamper", "Parameter tampering em campos de role/perfil/owner_id"),
      w("id-registration", "Registro: anti-duplicate, email verification, disposable email rejeitado"),
      b("id-provisioning", "Provisioning/de-provisioning checagem de privilégios"),
      b("id-enum", "Account enumeration — diferenças em mensagem/tempo de resposta", "CWE-204"),
      b("id-username", "Política de username forte (sem revelar PII)"),
    ],
  },
  {
    id: "auth",
    category: "AUTHENTICATION",
    title: "Autenticação",
    items: [
      b("au-http", "Login/register/forgot/change não em HTTP puro", "A02:2021"),
      b("au-default", "Credenciais default (admin/admin, org/org)"),
      b("au-lockout", "Lockout após N tentativas, CAPTCHA, recovery flow seguro"),
      b("au-bypass", "Bypass via forced browsing, session ID prediction, SQLi no login"),
      w("au-remember", "'Lembrar senha' — token server-side, não senha em plaintext"),
      w("au-cache", "Páginas sensíveis com cache-control adequado"),
      b("au-password", "Política de senha forte, min/max length, sem reuso de username"),
      b("au-reset", "Reset token único, expira, rate-limited"),
      b("au-change", "Change password pede senha antiga, invalida outras sessões"),
      b("au-channels", "Auth consistente em mobile, desktop, países, idiomas"),
      a("au-jwt-alg", "JWT: alg=none aceito? variações None/NONE/nOnE", "API2:2023"),
      a("au-jwt-confusion", "JWT: HS256 com pubkey RSA (algorithm confusion)"),
      a("au-jwt-claims", "JWT: exp/aud/iss/jti validados server-side"),
      a("au-jwt-kid", "JWT: kid injection (SQLi, path traversal, SSRF)"),
      a("au-oauth", "OAuth: state param, PKCE, redirect_uri whitelist, scope minimization"),
      a("au-mfa", "MFA bypass: response/status manipulation, null entry, brute OTP"),
    ],
  },
  {
    id: "authorization",
    category: "AUTHORIZATION",
    title: "Autorização",
    items: [
      w("az-lfi", "Local File Inclusion — testar URL/cookie params com ../"),
      w("az-rfi", "Remote File Inclusion"),
      b("az-traversal-enc", "Path traversal com encoding (Base64, URL, Hex, double-encoding)"),
      b("az-traversal-os", "Traversal Unix (../etc/passwd), Windows (..\\windows\\)"),
      b("az-horizontal", "Horizontal — User A acessa recurso de User B"),
      b("az-vertical", "Vertical — User comum acessa endpoints admin"),
      b("az-headers", "Bypass via custom headers (X-Forwarded-For, X-Original-URL, Referer)"),
      a("az-bola", "BOLA — Broken Object Level Authorization (API1:2023)", "API1:2023"),
      a("az-bfla", "BFLA — Broken Function Level Authorization (API5:2023)", "API5:2023"),
      a("az-bopla", "BOPLA — Broken Object Property Level Authorization (API3:2023)", "API3:2023"),
      a("az-idor-tricks", "IDOR variações: array [id], JSON wrap, case change, ext .json, version downgrade"),
      a("az-method-override", "X-HTTP-Method-Override pra bypass de role (POST → DELETE)"),
    ],
  },
  {
    id: "session",
    category: "SESSION MANAGEMENT",
    title: "Sessão",
    items: [
      w("se-cookie-secure", "Cookies: Secure + HttpOnly + SameSite=Strict"),
      w("se-cookie-fixation", "Session fixation — novo cookie emitido após login"),
      w("se-cookie-persistent", "Cookies persistentes têm expiração razoável"),
      b("se-after-logout", "Sessão invalidada após logout (server-side)"),
      b("se-concurrent", "Concurrent logins controlados / detectados"),
      b("se-decode", "Cookies não trivialmente decodificáveis (Base64, Hex, URL)"),
      b("se-exposed", "Session ID não em GET ou URL"),
      w("se-back-refresh", "Back refresh após logout/troca de senha não restaura sessão"),
      w("se-csrf-token", "Token CSRF validado server-side, full length", "A01:2021"),
      w("se-csrf-bypass", "CSRF bypass: trocar POST por GET, remover/blank token, multipart"),
      w("se-csrf-referrer", "CSRF: trocar Referer, Host, alongside clickjacking"),
      b("se-timeout", "Session timeout ativo, tokens destruídos"),
      b("se-hijack", "Session hijacking via cookies capturados (sem HSTS)"),
      a("se-jwt-revocation", "JWT: revocation list / short-lived tokens + refresh"),
    ],
  },
  {
    id: "input-validation",
    category: "INPUT VALIDATION",
    title: "Validação de Input",
    items: [
      w("iv-xss-reflected", "XSS refletido: <>'\"&, encoding tricks, case mixed, recursive filter", "A03:2021"),
      w("iv-xss-stored", "XSS stored: profile, comments, file upload, settings, forum"),
      w("iv-xss-dom", "DOM-based XSS — sinks (innerHTML, document.write, eval)"),
      b("iv-hpp", "HTTP Parameter Pollution — identificar parser e bypass de filtros"),
      b("iv-sqli-auth", "SQLi no login, search, campos editáveis", "A03:2021"),
      b("iv-sqli-types", "SQLi via GET, POST, COOKIE, HEADER"),
      b("iv-sqli-blind", "SQLi blind: boolean, time-based, conditional delays"),
      b("iv-sqli-bypass", "SQLi bypass: null bytes, URL encoding, case mixed, tamper scripts"),
      b("iv-nosql", "NoSQL Injection (MongoDB $ne $gt, JSON injection)"),
      b("iv-ldap", "LDAP Injection — filtros, access control bypass"),
      b("iv-xml", "XML Injection / XXE — entidades externas, DTD", "A05:2021"),
      w("iv-ssi", "Server-Side Includes"),
      b("iv-xpath", "XPATH Injection"),
      b("iv-cmd", "Command Injection — delimitadores |, ;, &&, $(), backticks"),
      b("iv-hhi", "Host Header Injection — password reset poisoning"),
      b("iv-ssrf", "SSRF — localhost, AWS metadata (169.254.169.254), internal services", "A10:2021"),
      b("iv-ssti", "SSTI — Razor, Jinja, Twig, Velocity (RCE potencial)"),
      a("iv-graphql", "GraphQL: introspection enabled, batching abuse, depth limit, alias bomb"),
      a("iv-mass-assignment", "Mass Assignment — body aceita role, isAdmin, balance", "API3:2023"),
      a("iv-resource", "API4:2023 — Unrestricted Resource Consumption (pagination, payload size)"),
    ],
  },
  {
    id: "error",
    category: "ERROR HANDLING",
    title: "Tratamento de Erros",
    items: [
      b("er-analyze", "Outputs de erro não revelam stack trace / debug info"),
      b("er-modify", "Modificar URL params, body, headers buscando erros verbosos"),
      b("er-formats", "Upload formato não reconhecido — força erro controlado"),
      b("er-inputs", "Inputs muito grandes / caracteres especiais — força erro controlado"),
    ],
  },
  {
    id: "crypto",
    category: "WEAK CRYPTOGRAPHY",
    title: "Criptografia",
    items: [
      b("cr-tls", "TLS: SSLv2/3, TLS 1.0/1.1, DROWN, POODLE, BEAST, FREAK"),
      b("cr-certs", "Certificados ≥2048 bits, SHA-256+, validade ok"),
      b("cr-ciphers", "Cipher suites fracas, null ciphers, RC4, 3DES desabilitados"),
      b("cr-rest", "Encryption at rest (DB, backups) ativada"),
      b("cr-keys", "Keys/secrets em vault (não em código nem env file commitado)"),
      b("cr-hash", "Senhas: bcrypt/argon2/scrypt (não MD5, SHA1, SHA256 puro)"),
    ],
  },
  {
    id: "business",
    category: "BUSINESS LOGIC",
    title: "Lógica de Negócio",
    items: [
      b("bl-flow", "Mapear lógica do app, função de cada botão / endpoint"),
      b("bl-numeric", "Trocar valores numéricos por negativos / muito altos (ex: PIX -1000)"),
      b("bl-quantity", "Manipular quantidades (carrinho com 0 ou negativo)"),
      b("bl-payment", "Modificar pagamentos (valor, moeda, destino, beneficiário)"),
      b("bl-tamper", "Parameter tampering em campos críticos (price, role, owner_id)"),
      b("bl-race", "Race condition — operações state-changing simultâneas", "CWE-362"),
      b("bl-replay", "Replay de transação assinada / token usado"),
      w("bl-upload-malicious", "Upload: payload no filename (XSS/RCE/LFI/SQL), RTL override"),
      b("bl-upload-large", "Upload de arquivo gigante (DoS)"),
      a("bl-business-flow", "API6:2023 Unrestricted Business Flow — compra em massa, voucher loop"),
      b("bl-pix-caixa", "(Caixa) PIX: validação de chave PIX, limite diário, beneficiário, cancelamento"),
      b("bl-siaci-caixa", "(Caixa) SIACI: validação de crédito imobiliário, parcela, garantias"),
    ],
  },
  {
    id: "client",
    category: "CLIENT SIDE",
    title: "Client-Side",
    items: [
      w("cs-redirect", "Open redirect — whitelist bypass, XSS via redirect, // bypass"),
      w("cs-cors", "CORS — Access-Control-Allow-Origin permissivo + credentials"),
      w("cs-clickjacking", "Clickjacking — X-Frame-Options / CSP frame-ancestors"),
      w("cs-postmessage", "postMessage sem origin check"),
      w("cs-prototype", "Prototype pollution em JS (Object.assign, lodash merge)"),
      w("cs-dependency", "Dependências NPM/Bower com CVEs conhecidos (Retire.js)"),
    ],
  },
  {
    id: "container",
    category: "CONTAINER & CLOUD",
    title: "Container & Cloud",
    items: [
      b("co-docker", "Docker: imagem oficial, scan Trivy, --read-only, drop capabilities, non-root"),
      b("co-k8s", "Kubernetes: RBAC mínimo, network policies, secrets encrypted at rest"),
      b("co-aws-iam", "AWS IAM: princípio do menor privilégio, MFA root, no wildcards"),
      b("co-aws-s3", "S3: bucket privado, BlockPublicAccess, server-side encryption"),
      b("co-aws-metadata", "IMDSv2 obrigatório (token required) pra mitigar SSRF"),
      b("co-azure", "Azure: Managed Identity, Key Vault, Defender for Cloud"),
      b("co-gcp", "GCP: IAM, Cloud KMS, VPC Service Controls"),
      b("co-secrets-scan", "Pre-commit hook gitleaks/trufflehog + scan no CI"),
    ],
  },
  {
    id: "other",
    category: "OUTROS",
    title: "Outros Issues Comuns",
    items: [
      b("ot-rate", "Rate limiting: bypass via case, /, headers duplicados, Origin, IP rotation"),
      b("ot-2fa", "2FA bypass: OAuth, brute, response/status manipulation, null entry"),
      b("ot-otp", "OTP bypass: OTP antigo, brute, null, response/status manipulation"),
      b("ot-spf", "SPF/DKIM/DMARC do domínio (anti-phishing)"),
      w("ot-exif", "EXIF geodata — site strip metadados de imagens"),
      w("ot-broken-link", "Broken link hijack (blc tool)"),
      b("ot-logging", "Logging suficiente pra forensics (auth, transações, mudanças sensíveis)"),
      b("ot-monitoring", "Monitoring/alerting de eventos anômalos"),
    ],
  },
]

// API extra section — só aparece quando scope = api ou both, complementa o que já tem
export const OWASP_API_EXTRA: ChecklistSection = {
  id: "api-top10",
  category: "OWASP API SECURITY TOP 10 2023",
  title: "Recap API Top 10",
  items: [
    a("api1", "API1:2023 BOLA — ownership check em cada endpoint que recebe ID", "API1:2023"),
    a("api2", "API2:2023 Broken Authentication — JWT, OAuth, session", "API2:2023"),
    a("api3", "API3:2023 Mass Assignment — DTOs explícitos / [Bind]", "API3:2023"),
    a("api4", "API4:2023 Resource Consumption — rate-limit, payload size, query timeout", "API4:2023"),
    a("api5", "API5:2023 Broken Function Level Auth — user comum em endpoint admin", "API5:2023"),
    a("api6", "API6:2023 Unrestricted Business Flow — abuse de fluxo (mass buy, loop)", "API6:2023"),
    a("api7", "API7:2023 SSRF — endpoint que faz fetch de URL controlada", "API7:2023"),
    a("api8", "API8:2023 Security Misconfiguration — CORS, headers, TLS, CSP", "API8:2023"),
    a("api9", "API9:2023 Inventory Mgmt — versões antigas /v1 com vulns ativas", "API9:2023"),
    a("api10", "API10:2023 Unsafe Consumption — confiar em third-party sem validação", "API10:2023"),
  ],
}
