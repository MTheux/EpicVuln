import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

export class LlmService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key-waiting-for-user');
  }

  async generateAnalysis() {
    // 1. Puxando as vulnerabilidades ativas da CredSystem para embasar a IA
    const vulnerabilidades = await prisma.vulnerability.findMany({
      where: {
        status: {
          notIn: ['CONCLUIDO', 'FECHADO', 'MITIGADO', 'RISCO_ACEITO'] // Ignorando resolvidos
        }
      },
      select: {
        criticidade: true,
        squad: true,
        sistema: true,
        ativo: true,
        owaspCategory: true,
        diasEmAberto: true,
        reincidencia: true
      }
    });

    const activeCount = vulnerabilidades.length;

    // Proteção de fallback se o user ainda não botou a API Key no .env
    if (!process.env.GEMINI_API_KEY) {
      return {
        resumoExecutivo: "Configuração Pendente: Cérebro da Mytchi AI Desconectado.",
        fortaleza: "A sua chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do backend.",
        fraqueza: "Sem ela, o relatório C-Level gerativo fica desligado.",
        acao: "Acesse o arquivo .env do backend, declare a sua 'GEMINI_API_KEY=AI...', e reinicie a aplicação."
      };
    }

    if (activeCount === 0) {
      return {
        resumoExecutivo: "O ambiente da CredSystem está impecável. Nenhuma vulnerabilidade pendente localizada.",
        fortaleza: "Operação livre de gaps listados no banco de dados. Equipe atuou em 100% das falhas.",
        fraqueza: "Nenhum vetor de vulnerabilidade aberto no momento.",
        acao: "Manter governança e rotina atual de monitoramento diário."
      };
    }

    // Comprimindo pra enviar no Prompt e não gastar tokens demais
    const contextData = JSON.stringify(vulnerabilidades);

    const systemPrompt = `Você é a "Mytchi AI", o Chief Information Security Officer (CISO) e Head de Application Security da "CredSystem", uma instituição financeira de alto rigor transacional.

Sua missão é ler um dump de dados contendo todas as vulnerabilidades de software (AppSec) atualmente em aberto nas nossas esteiras de desenvolvimento e infraestrutura.

Diretrizes de Análise:
1. FOCO NO NEGÓCIO: Avalie as falhas estritamente sob a ótica de um Banco. Fraquezas em APIs do aplicativo (AppMais), vazamento de credenciais e quebras de Controle de Acesso representam risco de fraude.
2. FRAMEWORKS: Baseie seus julgamentos no OWASP Top 10 e apontamentos do NIST.
3. PRAGMATISMO: Seja direto e executivo.

Com base na massa de dados fornecida, gere EXATAMENTE um objeto JSON contendo as chaves a seguir:

{
  "resumoExecutivo": "MÁXIMO 2 linhas do veredito macro operacional.",
  "fortaleza": "MÁXIMO 2 linhas. Onde a equipe acerta, Squads sem críticos.",
  "fraqueza": "MÁXIMO 2 linhas. O Calcanhar de Aquiles e risco de perda financeira.",
  "acao": "MÁXIMO 2 linhas. Plano prático imediato.",
  
  "evolucao": [
     {"mes": "Jan", "fechadas": 15, "abertas": 5},
     {"mes": "Fev", "fechadas": 22, "abertas": 8},
     {"mes": "Mar", "fechadas": 30, "abertas": 3}
  ],

  "attackPath": [
     {"node": "Phishing/Clickjacking", "escalatesTo": "Sessão Roubada"},
     {"node": "Sessão Roubada", "escalatesTo": "Acesso à API Core"},
     {"node": "Acesso à API Core", "escalatesTo": "Extração de Dados (CredSystem)"}
  ]
}

A chave "evolucao" deve ser um array fictício simulando uma crescente de fechamentos mensais de falhas.
A chave "attackPath" deve criar uma Cadeia de Exploração Lógica, mostrando como a falha A existente no payload (ou similar genérica) pode alavancar a intrusão para B e C no banco de dados.

IMPORTANTE: DEVOLVA APENAS O JSON PURO E VÁLIDO. TUDO SERÁ PARSEADO NO FRONTEND.
Massa de dados das ${activeCount} vulnerabilidades: ${contextData}`;

    try {
      console.log("Mytchi AI: Iniciando análise com modelo gemini-2.0-flash...");
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      let text = response.text();
      
      // Trata markdown
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (e: any) {
      console.error("Gemini Error:", e.message);
      return {
        resumoExecutivo: "Erro ao gerar Relatório Executivo.",
        fortaleza: "Servidor detectou falha ao comunicar com Google Gemini.",
        fraqueza: "Causa base: " + e.message,
        acao: "Contatar suporte de Arquitetura de Software."
      };
    }
  }
}
