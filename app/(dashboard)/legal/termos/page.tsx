"use client"
import { FileText } from "lucide-react"
import { LegalPage } from "@/components/legal-page"

export default function TermosPage() {
  return (
    <LegalPage icon={FileText} title="Termos de Serviço" subtitle="Condições de uso do AISEC" updatedAt="24 de Maio de 2026">
      <p>
        Ao acessar e usar o AISEC, você concorda com estes Termos. Leia atentamente. Se não concordar, não use a plataforma.
      </p>

      <h2>1. Sobre a Plataforma</h2>
      <p>
        O AISEC é uma plataforma corporativa de AppSec & ASPM operada pela Unisys Corporation no contexto do contrato firmado com a Caixa Econômica Federal. Acesso é restrito a usuários autorizados pela Caixa e/ou Unisys.
      </p>

      <h2>2. Elegibilidade e Acesso</h2>
      <ul>
        <li>Acesso restrito a colaboradores Unisys e Caixa com credenciais corporativas válidas.</li>
        <li>Usuário responsável por manter confidencialidade das credenciais e do MFA.</li>
        <li>Compartilhamento de conta é proibido e pode causar bloqueio + ação disciplinar.</li>
      </ul>

      <h2>3. Uso Aceitável</h2>
      <p>Você concorda em:</p>
      <ul>
        <li>Usar a plataforma apenas para finalidades autorizadas (gestão de vulnerabilidades, pentest, threat modeling)</li>
        <li>Não tentar acessar, modificar ou interferir em recursos não autorizados</li>
        <li>Não executar testes destrutivos em ambientes de produção sem autorização CISO + Legal</li>
        <li>Reportar incidentes/vulnerabilidades identificados na própria plataforma imediatamente</li>
        <li>Aderir à <strong>Unisys AI Acceptable Use Policy P1.0</strong> ao usar o Motor IA</li>
      </ul>

      <h2>4. Restrições de Uso</h2>
      <p>É expressamente proibido:</p>
      <ul>
        <li>Engenharia reversa do código-fonte (exceto na medida permitida por lei)</li>
        <li>Acesso automatizado em massa sem autorização (scraping, scanning)</li>
        <li>Uso de provider de IA externo (não-approved) com dados confidenciais Unisys/Caixa</li>
        <li>Compartilhar relatórios/laudos com terceiros sem autorização do DPO</li>
        <li>Usar a plataforma para ataques a sistemas sem autorização escrita do dono</li>
      </ul>

      <h2>5. Skills Agênticas e Política de IA</h2>
      <p>
        As skills (Zekrom, Forge, Mirror, Audit, Pulse) e o HackBot operam sob <strong>human oversight obrigatório</strong>. Output IA não substitui análise técnica humana e deve ser validado antes de qualquer ação. Toda chamada IA é logada em /admin/auditoria.
      </p>
      <p>
        Pentest automatizado (Zekrom executando requests) requer autorização formal CISO + Legal, ambiente HML/QA, allowlist de hosts e audit trail imutável. Detalhes em <a href="/admin/motor-ia">Motor IA & Skills</a>.
      </p>

      <h2>6. Propriedade Intelectual</h2>
      <ul>
        <li>Código-fonte, design e marca <strong>AISEC</strong> são propriedade da Unisys Corporation.</li>
        <li>Dados inseridos pelos clientes (vulns, docs, configs) permanecem propriedade da Caixa.</li>
        <li>Outputs gerados por IA são marcados como "Content Created By/With Use of AI" — uso comercial sujeito a verificação humana.</li>
      </ul>

      <h2>7. Disponibilidade e SLA</h2>
      <p>
        Esforço de disponibilidade 99.5% em horário comercial. Manutenções programadas comunicadas com 48h de antecedência. SLA detalhado consta no contrato Unisys ↔ Caixa.
      </p>

      <h2>8. Limitação de Responsabilidade</h2>
      <p>
        A Unisys envida melhores esforços, mas não garante que a plataforma estará livre de erros ou interrupções. Em hipótese alguma a Unisys será responsável por danos indiretos, lucros cessantes ou perdas decorrentes de decisões tomadas exclusivamente com base em outputs de IA sem validação humana.
      </p>

      <h2>9. Confidencialidade</h2>
      <p>
        Você reconhece que dados de vulnerabilidades, arquiteturas e requests HTTP são <strong>Confidential Information</strong> da Caixa e devem ser protegidos conforme NDA assinado. Compartilhamento não autorizado pode resultar em sanção administrativa, contratual e penal.
      </p>

      <h2>10. Suspensão e Encerramento</h2>
      <ul>
        <li>Conta pode ser suspensa por violação destes Termos ou da Unisys AI Policy.</li>
        <li>Encerramento de contrato Unisys ↔ Caixa encerra acesso automaticamente.</li>
        <li>Dados são devolvidos ou destruídos conforme cláusulas do DPA.</li>
      </ul>

      <h2>11. Modificações</h2>
      <p>
        Estes Termos podem ser alterados. Mudanças materiais notificadas com 30 dias de antecedência. Uso continuado da plataforma após mudanças constitui aceitação.
      </p>

      <h2>12. Lei Aplicável e Foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir controvérsias, salvo disposição contratual diversa entre Unisys e Caixa.
      </p>

      <h2>13. Contato</h2>
      <ul>
        <li>Operacional: support@unisys.com</li>
        <li>Legal: legal@unisys.com</li>
        <li>DPO: privacy@unisys.com</li>
      </ul>
    </LegalPage>
  )
}
