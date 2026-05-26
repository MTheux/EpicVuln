import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@unisys.com', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'security@unisys.com', name: 'Analista AppSec', role: 'SEGURANCA' as const },
    { email: 'gestor@unisys.com', name: 'Gestor de Seguranca', role: 'GESTOR' as const },
    { email: 'squad@unisys.com', name: 'Dev Squad Backend', role: 'SQUAD' as const },
    { email: 'leitor@unisys.com', name: 'Auditor Externo', role: 'LEITURA' as const },
  ];

  // Create admin user with fixed password
  const adminPassword = await bcrypt.hash('admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@unisys.com' },
    update: { password: adminPassword, active: true },
    create: {
      email: 'admin@unisys.com',
      name: 'Administrador',
      role: 'ADMIN',
      password: adminPassword,
      active: true,
    },
  });
  console.log(`[ADMIN] ${adminUser.email} => Senha: admin@123`);

  // Em producao, use SEED_ADMIN_PASSWORD env var. Em dev, gera senhas aleatorias.
  const envPassword = process.env.SEED_ADMIN_PASSWORD;

  console.log('\n=== EpicVuln Seed - Credenciais Iniciais ===\n');

  for (const u of users) {
    const password = envPassword || crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hash, active: true },
      create: { ...u, password: hash, active: true },
    });

    console.log(`[${u.role}] ${user.email} => Senha: ${envPassword ? '(definida via SEED_ADMIN_PASSWORD)' : password}`);
  }

  console.log('\n=== IMPORTANTE: Anote as senhas acima. Elas nao serao exibidas novamente. ===\n');

  await seedDemoVulnerabilities(adminUser.id);
}

async function seedDemoVulnerabilities(createdById: string) {
  const existing = await prisma.vulnerability.count();
  if (existing > 0) {
    console.log(`[SEED] ${existing} vulnerabilidades já existem — pulando seed demo.`);
    return;
  }

  const squads = [
    'NM182 - Originação e Entrada de Dados - SIACI',
    'NM177 - Financeiro e Garantias - SIACI',
    'NM180 - Portais e Serviços - SIACI',
    'NM181 - Evolução - SIACI',
    'NM176 - Recursos e Componentes - SIACI',
  ];

  const demos: Array<{
    titulo: string; descTec: string; descExec: string; crit: 'CRITICA'|'ALTA'|'MEDIA'|'BAIXA';
    status: 'NOVO'|'ABERTO'|'EM_CORRECAO'|'EM_RETESTE'|'CONCLUIDO';
    cwe: string; owasp: string; origem: 'PENTEST'|'DAST'|'SAST'|'SCA';
    squad: string; sistema: string; ativo: string; endpoint?: string; metodo?: string;
    impacto: string; recomendacao: string; diasAberto: number; reincidencia?: number;
  }> = [
    { titulo: 'BOLA em /api/transferencias/{id}', descTec: 'Endpoint retorna transferência de qualquer usuário desde que o ID seja conhecido. Não há checagem de ownership contra o sub do JWT.', descExec: 'Permite acesso a transferências PIX de outros clientes.', crit: 'CRITICA', status: 'EM_CORRECAO', cwe: 'CWE-284', owasp: 'API1:2023', origem: 'PENTEST', squad: squads[0], sistema: 'SIACI Originação', ativo: 'siaci-originacao-api', endpoint: '/api/transferencias/{id}', metodo: 'GET', impacto: 'Vazamento massivo de dados transacionais, violação LGPD + BACEN 4658.', recomendacao: 'Filtrar por ownership: WHERE id = :id AND owner_id = :user_id_from_jwt', diasAberto: 22 },
    { titulo: 'SQL Injection em /api/pix/cancelar', descTec: 'Parâmetro motivo é concatenado em query dinâmica. Payload `\' OR 1=1--` retorna todos cancelamentos.', descExec: 'Injeção SQL crítica em endpoint PIX.', crit: 'CRITICA', status: 'ABERTO', cwe: 'CWE-89', owasp: 'A03:2021', origem: 'DAST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', endpoint: '/api/pix/cancelar', metodo: 'POST', impacto: 'Extração de dados sensíveis e cancelamento massivo de PIX.', recomendacao: 'Usar prepared statements com Entity Framework. OWASP ASVS V5.3.4.', diasAberto: 8 },
    { titulo: 'Hardcoded API Key em bundle JS público', descTec: 'main.bundle.js linha 1247 expõe `AKIA****` (AWS access key) e `sk-proj-****` (OpenAI).', descExec: 'Credenciais cloud em código público.', crit: 'CRITICA', status: 'ABERTO', cwe: 'CWE-321', owasp: 'A02:2021', origem: 'SAST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-publico', impacto: 'Acesso a infra AWS, custo descontrolado, escalação para dados.', recomendacao: 'Mover secrets pra variáveis de ambiente. Rotacionar credenciais imediatamente.', diasAberto: 15 },
    { titulo: 'Mass Assignment em /api/usuarios/{id}', descTec: 'PUT aceita campo isAdmin no body. Usuário comum pode escalar pra admin.', descExec: 'Escalação de privilégios via mass-assignment.', crit: 'CRITICA', status: 'EM_RETESTE', cwe: 'CWE-915', owasp: 'API3:2023', origem: 'PENTEST', squad: squads[0], sistema: 'SIACI Originação', ativo: 'siaci-originacao-api', endpoint: '/api/usuarios/{id}', metodo: 'PUT', impacto: 'Tomada de conta administrativa.', recomendacao: 'DTOs explícitos + [Bind] em ASP.NET Core. ASVS V4.2.1.', diasAberto: 5 },
    { titulo: 'JWT sem validação de aud (audience)', descTec: 'Middleware aceita JWT de qualquer issuer da Caixa, sem checar audience. Token do serviço A funciona no serviço B.', descExec: 'Token cross-service replay.', crit: 'ALTA', status: 'ABERTO', cwe: 'CWE-345', owasp: 'API2:2023', origem: 'PENTEST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', impacto: 'Movimento lateral entre serviços com mesmo token.', recomendacao: 'Validar claim aud no middleware com whitelist explícita.', diasAberto: 12 },
    { titulo: 'CORS com origin * em endpoint autenticado', descTec: 'API responde Access-Control-Allow-Origin: * e Allow-Credentials: true.', descExec: 'CSRF / vazamento cross-origin.', crit: 'ALTA', status: 'ABERTO', cwe: 'CWE-942', owasp: 'A05:2021', origem: 'DAST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-api', impacto: 'Site malicioso lê dados autenticados.', recomendacao: 'Whitelist de origins. Nunca * com credentials.', diasAberto: 9 },
    { titulo: 'Falta de rate-limit em /api/auth/login', descTec: 'Endpoint aceita brute-force sem lockout. 1000 tentativas/min testadas sem block.', descExec: 'Risco de credential stuffing.', crit: 'ALTA', status: 'NOVO', cwe: 'CWE-307', owasp: 'API4:2023', origem: 'PENTEST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', endpoint: '/api/auth/login', metodo: 'POST', impacto: 'Comprometimento de contas via senha fraca.', recomendacao: 'Rate-limit por IP+username com backoff exponencial. Lockout após 5 falhas.', diasAberto: 3 },
    { titulo: 'XSS refletido em parâmetro busca', descTec: 'GET /portal/busca?q=<script>alert(1)</script> reflete sem encoding.', descExec: 'XSS no portal público.', crit: 'ALTA', status: 'EM_CORRECAO', cwe: 'CWE-79', owasp: 'A03:2021', origem: 'DAST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-publico', endpoint: '/portal/busca', metodo: 'GET', impacto: 'Roubo de sessão de clientes acessando link malicioso.', recomendacao: 'HTML encoding na saída. CSP strict-dynamic.', diasAberto: 7 },
    { titulo: 'Dependência vulnerável: Newtonsoft.Json 9.0.1', descTec: 'CVE-2024-21907 (DoS via deserialização). Versão usada: 9.0.1; corrigida: 13.0.1.', descExec: 'DoS em deserialização de payloads grandes.', crit: 'ALTA', status: 'ABERTO', cwe: 'CWE-1333', owasp: 'A06:2021', origem: 'SCA', squad: squads[4], sistema: 'SIACI Componentes', ativo: 'siaci-shared-components', impacto: 'Indisponibilidade do serviço sob payload malicioso.', recomendacao: 'Upgrade pra Newtonsoft.Json >= 13.0.3.', diasAberto: 18 },
    { titulo: 'TLS 1.0 ainda aceito em endpoint de teste', descTec: 'sslscan mostra TLSv1.0 e TLSv1.1 enabled. Cifras RC4 detectadas.', descExec: 'Cifras obsoletas habilitadas.', crit: 'ALTA', status: 'NOVO', cwe: 'CWE-319', owasp: 'A02:2021', origem: 'DAST', squad: squads[3], sistema: 'SIACI Evolução', ativo: 'siaci-evolucao-lab', impacto: 'MITM, vazamento de tokens.', recomendacao: 'Forçar TLS 1.2+, desabilitar RC4/3DES.', diasAberto: 1 },
    { titulo: 'Falta de validação de tamanho em upload', descTec: 'Endpoint /api/upload aceita arquivos de qualquer tamanho — testado com 2GB sem rejeição.', descExec: 'DoS via upload grande.', crit: 'MEDIA', status: 'EM_BACKLOG', cwe: 'CWE-400', owasp: 'API4:2023', origem: 'PENTEST', squad: squads[0], sistema: 'SIACI Originação', ativo: 'siaci-originacao-api', endpoint: '/api/upload', metodo: 'POST', impacto: 'Consumo de disco/memória do servidor.', recomendacao: 'Limite 10MB por arquivo + validação MIME.', diasAberto: 30 },
    { titulo: 'CSP ausente no portal público', descTec: 'Header Content-Security-Policy não presente em nenhuma resposta.', descExec: 'Defense in depth ausente.', crit: 'MEDIA', status: 'ABERTO', cwe: 'CWE-693', owasp: 'A05:2021', origem: 'DAST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-publico', impacto: 'Sem mitigação adicional contra XSS.', recomendacao: 'CSP default-src self + nonce nos scripts inline.', diasAberto: 14 },
    { titulo: 'Erro 500 vazando stack trace', descTec: 'Em produção, erro genérico retorna full stack trace ASP.NET incluindo paths de servidor.', descExec: 'Information disclosure.', crit: 'MEDIA', status: 'CONCLUIDO', cwe: 'CWE-209', owasp: 'A04:2021', origem: 'PENTEST', squad: squads[0], sistema: 'SIACI Originação', ativo: 'siaci-originacao-frontend', impacto: 'Recon facilitado para atacante.', recomendacao: 'app.UseExceptionHandler com response genérico em prod.', diasAberto: 45, reincidencia: 1 },
    { titulo: 'Logs sem correlation_id em transferências', descTec: 'Logs do batch COBOL não trazem correlation_id, dificultando rastreio.', descExec: 'Repúdio possível por falta de auditoria.', crit: 'MEDIA', status: 'EM_BACKLOG', cwe: 'CWE-778', owasp: 'A09:2021', origem: 'CODE_REVIEW' as any, squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-cobol', impacto: 'Investigação de incidente impossibilitada.', recomendacao: 'Propagar correlation_id ASP.NET → COBOL via header X-Correlation-ID.', diasAberto: 20 },
    { titulo: 'Cookie de sessão sem HttpOnly', descTec: 'Cookie ASPXAUTH não tem flag HttpOnly nem Secure.', descExec: 'Cookie acessível via JavaScript.', crit: 'MEDIA', status: 'NOVO', cwe: 'CWE-1004', owasp: 'A05:2021', origem: 'DAST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-publico', impacto: 'XSS pode roubar sessão.', recomendacao: 'options.Cookie.HttpOnly = true; options.Cookie.SecurePolicy = Always.', diasAberto: 4 },
    { titulo: 'Falta de validação de range em valor PIX', descTec: 'Backend aceita valor negativo na transferência. Testado com -1000 → credita atacante.', descExec: 'Falha de regra de negócio crítica.', crit: 'CRITICA', status: 'EM_RETESTE', cwe: 'CWE-20', owasp: 'A04:2021', origem: 'PENTEST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', endpoint: '/api/pix/transferir', metodo: 'POST', impacto: 'Fraude direta com perda financeira.', recomendacao: 'Validar valor > 0 && valor <= limiteDiario no domain layer.', diasAberto: 6 },
    { titulo: 'Endpoint /api/debug exposto em produção', descTec: 'GET /api/debug/info retorna versão framework, paths internos e env vars.', descExec: 'Debug endpoint exposto.', crit: 'ALTA', status: 'ABERTO', cwe: 'CWE-489', owasp: 'A05:2021', origem: 'DAST', squad: squads[3], sistema: 'SIACI Evolução', ativo: 'siaci-evolucao-lab', endpoint: '/api/debug/info', metodo: 'GET', impacto: 'Recon detalhada da infra.', recomendacao: 'Remover endpoint ou proteger com auth + flag de ambiente.', diasAberto: 11 },
    { titulo: 'Função de export sem paginação', descTec: 'GET /api/contas/export sem limit retorna toda a base (~2M registros).', descExec: 'Risco de extração massiva + DoS.', crit: 'MEDIA', status: 'EM_BACKLOG', cwe: 'CWE-770', owasp: 'API4:2023', origem: 'PENTEST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', endpoint: '/api/contas/export', metodo: 'GET', impacto: 'Dump completo + sobrecarga.', recomendacao: 'Paginação obrigatória + autorização granular.', diasAberto: 28 },
    { titulo: 'Path traversal em /api/docs/download', descTec: 'Parâmetro file aceita ../. Testado com ../../../../etc/passwd → 200.', descExec: 'Leitura arbitrária de arquivos.', crit: 'CRITICA', status: 'NOVO', cwe: 'CWE-22', owasp: 'A01:2021', origem: 'PENTEST', squad: squads[2], sistema: 'SIACI Portais', ativo: 'siaci-portal-api', endpoint: '/api/docs/download', metodo: 'GET', impacto: 'Vazamento de configs, chaves, código-fonte.', recomendacao: 'Path.Combine + checagem com Path.GetFullPath contra basePath whitelisted.', diasAberto: 2 },
    { titulo: 'Resposta verbose em login (enum usuário)', descTec: 'Diferença de tempo + mensagem "Usuário não existe" vs "Senha inválida" permite enumeração.', descExec: 'Enumeração de usuários.', crit: 'BAIXA', status: 'CONCLUIDO', cwe: 'CWE-203', owasp: 'A07:2021', origem: 'PENTEST', squad: squads[1], sistema: 'SIACI Financeiro', ativo: 'siaci-financeiro-api', endpoint: '/api/auth/login', metodo: 'POST', impacto: 'Lista de usuários válidos vaza.', recomendacao: 'Mensagem genérica + tempo constante.', diasAberto: 60 },
  ];

  const slaMap: Record<string, number> = { CRITICA: 7, ALTA: 14, MEDIA: 30, BAIXA: 60 };

  for (const [i, v] of demos.entries()) {
    const slaDate = new Date();
    slaDate.setDate(slaDate.getDate() + slaMap[v.crit] - v.diasAberto);
    const detectionDate = new Date();
    detectionDate.setDate(detectionDate.getDate() - v.diasAberto);
    await prisma.vulnerability.create({
      data: {
        codigoInterno: `VUL-CXA-${String(381 + i).padStart(4, '0')}`,
        jiraKey: `EPICO-${1000 + i}`,
        titulo: v.titulo,
        descricaoExecutiva: v.descExec,
        descricaoTecnica: v.descTec,
        criticidade: v.crit,
        status: v.status,
        cwe: v.cwe,
        owaspCategory: v.owasp,
        origem: v.origem as any,
        squad: v.squad,
        sistema: v.sistema,
        ativo: v.ativo,
        endpoint: v.endpoint,
        metodoHttp: v.metodo,
        impacto: v.impacto,
        recomendacao: v.recomendacao,
        ambiente: 'PRODUCAO',
        dataDeteccao: detectionDate,
        diasEmAberto: v.diasAberto,
        sla: slaDate,
        reincidencia: v.reincidencia || 0,
        createdById,
        tags: ['SIACI', v.crit],
      },
    });
  }
  console.log(`[SEED] ${demos.length} vulnerabilidades demo criadas.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
