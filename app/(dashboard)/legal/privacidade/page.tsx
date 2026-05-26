"use client"
import { Shield } from "lucide-react"
import { LegalPage } from "@/components/legal-page"

export default function PrivacidadePage() {
  return (
    <LegalPage icon={Shield} title="Política de Privacidade" subtitle="Conformidade LGPD · GDPR · CCPA/CPRA" updatedAt="24 de Maio de 2026">
      <p>
        O AISEC (operado pela Unisys Corporation no contexto do contrato com a Caixa Econômica Federal) coleta, processa e armazena dados pessoais e dados de segurança para viabilizar a plataforma de AppSec & ASPM. Esta política descreve o que coletamos, por quê, com quem compartilhamos, e seus direitos como titular.
      </p>

      <h2>1. Controlador de Dados</h2>
      <p>
        <strong>Unisys Corporation</strong> atua como Operadora de Dados em nome da Caixa Econômica Federal (Controladora). Para questões relativas a este Tratamento, contate o DPO indicado na seção 17.
      </p>

      <h2>2. Dados Coletados</h2>
      <ul>
        <li><strong>Dados de Identificação:</strong> nome, e-mail corporativo, matrícula/ID interno, cargo, squad/área.</li>
        <li><strong>Dados Técnicos:</strong> endereço IP, user agent, timestamps de acesso, ações realizadas na plataforma.</li>
        <li><strong>Dados Operacionais:</strong> vulnerabilidades reportadas, requests HTTP capturados (Burp/HAR), specs OpenAPI, documentos uploaded na Base de Conhecimento.</li>
        <li><strong>Dados de Autenticação:</strong> hash de senha (bcrypt), tokens JWT de sessão, segredos MFA TOTP cifrados.</li>
        <li><strong>Logs de IA:</strong> prompts, respostas, tokens consumidos, latência e provider usado em cada chamada ao Motor IA.</li>
      </ul>

      <h2>3. Finalidades e Base Legal</h2>
      <p>Tratamos seus dados nas seguintes bases legais (LGPD Art. 7º, GDPR Art. 6):</p>
      <ul>
        <li><strong>Execução de contrato</strong> (LGPD VI, GDPR 6.1.b) — operar a plataforma contratada pela Caixa.</li>
        <li><strong>Cumprimento de obrigação legal</strong> (LGPD II, GDPR 6.1.c) — BACEN Res. 4658, Marco Civil.</li>
        <li><strong>Interesse legítimo</strong> (LGPD IX, GDPR 6.1.f) — segurança da informação, prevenção de fraude, auditoria.</li>
        <li><strong>Consentimento</strong> (LGPD VIII, GDPR 6.1.a) — para usos não essenciais (ex: telemetria opcional).</li>
      </ul>

      <h2>4. Compartilhamento de Dados</h2>
      <p>
        Compartilhamos dados com sub-processadores estritamente necessários (cloud, IA, CDN, e-mail) — vide página de <a href="/legal/sub-processadores">Sub-processadores</a> com categoria, finalidade e localização. Nunca vendemos dados pessoais.
      </p>

      <h2>5. Transferência Internacional de Dados</h2>
      <p>
        Alguns sub-processadores operam fora do Brasil (EUA, União Europeia). Toda transferência segue cláusulas contratuais padrão (SCC) aprovadas pela ANPD/Comissão Europeia, com nível de proteção equivalente ao da LGPD/GDPR. Decisões sobre Adequacy ou Standard Contractual Clauses são documentadas no Registro de Operações de Tratamento.
      </p>

      <h2>6. Retenção de Dados</h2>
      <ul>
        <li>Logs de auditoria: <strong>5 anos</strong> (BACEN Res. 4658 §4).</li>
        <li>Dados de vulnerabilidades: enquanto o contrato com a Caixa estiver vigente + 2 anos para auditoria.</li>
        <li>Logs de IA: <strong>180 dias</strong> rolling, exceto quando vinculados a incidente reportado.</li>
        <li>Dados de autenticação: até o encerramento da conta + 90 dias para revogação completa.</li>
        <li>Backups: até 90 dias após exclusão dos dados primários.</li>
      </ul>

      <h2>7. Direitos do Titular dos Dados</h2>
      <p>Conforme LGPD Art. 18 / GDPR Art. 15-22, você tem direito a:</p>
      <ul>
        <li>Confirmação da existência de tratamento</li>
        <li>Acesso aos dados</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou em desconformidade</li>
        <li>Portabilidade dos dados</li>
        <li>Eliminação dos dados tratados com base no consentimento</li>
        <li>Informação sobre entidades públicas e privadas com as quais o controlador compartilha dados</li>
        <li>Revogação do consentimento</li>
        <li>Oposição ao tratamento</li>
      </ul>
      <p>Para exercer seus direitos, contate o DPO (seção 17). Resposta em até 15 dias úteis.</p>

      <h2>8. Cookies e Tecnologias de Rastreamento</h2>
      <p>
        Utilizamos cookies estritamente necessários (sessão JWT HttpOnly + Secure + SameSite=Strict). Não usamos cookies de publicidade, tracking de terceiros ou fingerprinting. Telemetria interna roda só com consentimento explícito.
      </p>

      <h2>9. Segurança da Informação</h2>
      <p>Aplicamos controles técnicos e organizacionais alinhados a ISO 27001, NIST CSF e BACEN Res. 4658:</p>
      <ul>
        <li>Criptografia at-rest (PostgreSQL TDE) e in-transit (TLS 1.3)</li>
        <li>MFA TOTP obrigatório para acessos privilegiados</li>
        <li>Princípio do menor privilégio (RBAC com 5 papéis)</li>
        <li>Logs imutáveis com retenção 5 anos</li>
        <li>Threat modeling em todo novo recurso</li>
        <li>Pentest interno trimestral + externo anual</li>
      </ul>

      <h2>10. Incidentes de Segurança</h2>
      <p>
        Em caso de incidente que afete dados pessoais: notificação à ANPD em até <strong>72 horas</strong> (LGPD Art. 48); comunicação aos titulares afetados quando houver risco relevante; investigação forense com preservação de evidências; relatório de impacto à privacidade.
      </p>

      <h2>11. Processamento de Dados (Acordo de Processamento)</h2>
      <p>
        Cláusulas de processamento (DPA) são parte integrante do contrato Unisys ↔ Caixa, cobrindo: finalidades, instruções documentadas, sub-processamento, retorno/destruição de dados ao término, auditoria, cooperação com autoridades, e responsabilidades em incidente.
      </p>

      <h2>12. Disposições Específicas — Brasil (LGPD)</h2>
      <p>Em conformidade com a <strong>Lei nº 13.709/2018 (LGPD)</strong>:</p>
      <ul>
        <li>DPO designado e canal direto para titulares</li>
        <li>Registro de Operações de Tratamento (Art. 37)</li>
        <li>Relatório de Impacto à Proteção de Dados (RIPD) para tratamentos de alto risco</li>
        <li>Adequação a transferências internacionais via SCC (Resolução ANPD nº 4/2023)</li>
        <li>Atendimento a requisições da ANPD em prazos legais</li>
      </ul>

      <h2>13. Disposições Específicas — União Europeia (GDPR)</h2>
      <p>Quando aplicável (titulares no EEE):</p>
      <ul>
        <li>Lawful basis explícita por finalidade (Art. 6)</li>
        <li>Data Protection Impact Assessment (DPIA) para alto risco</li>
        <li>Right to be forgotten (Art. 17), data portability (Art. 20)</li>
        <li>Representante na UE designado quando aplicável (Art. 27)</li>
      </ul>

      <h2>14. Disposições Específicas — Estados Unidos (CCPA/CPRA)</h2>
      <p>Para residentes da Califórnia:</p>
      <ul>
        <li>Right to know, right to delete, right to opt-out of sale (não vendemos dados)</li>
        <li>Right to correct inaccurate personal information</li>
        <li>Right to limit use of sensitive personal information</li>
        <li>Non-discrimination por exercício de direitos</li>
      </ul>

      <h2>15. Menores de Idade</h2>
      <p>
        O AISEC não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos tal coleta, eliminamos imediatamente.
      </p>

      <h2>16. Alterações desta Política</h2>
      <p>
        Mudanças materiais são comunicadas via e-mail aos usuários ativos com pelo menos 30 dias de antecedência. O histórico de versões fica disponível mediante solicitação ao DPO.
      </p>

      <h2>17. Contato e Encarregado de Proteção de Dados (DPO)</h2>
      <ul>
        <li><strong>DPO Unisys:</strong> privacy@unisys.com</li>
        <li><strong>DPO Caixa (Controladora):</strong> dpo@caixa.gov.br</li>
        <li><strong>Endereço postal:</strong> Unisys Brasil — Av. Eng. Luís Carlos Berrini, São Paulo/SP</li>
        <li><strong>Autoridade reguladora:</strong> ANPD — <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer">gov.br/anpd</a></li>
      </ul>
    </LegalPage>
  )
}
