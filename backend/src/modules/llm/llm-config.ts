import fs from 'fs';
import path from 'path';

export interface LlmConfig {
  provider: 'groq' | 'openai' | 'anthropic' | 'google' | 'ollama' | 'github' | 'demo' | 'deepseek';
  apiKey: string;
  model: string;
  baseUrl?: string; // For Ollama, DeepSeek or custom endpoints
  visionModel?: string; // optional separate model for vision (some providers serve text+vision in different SKUs)
}

/**
 * Provider compliance posture per Unisys AI Acceptable Use Guidelines.
 * - approved: explicitly allowed for confidential/IP data
 * - local: zero data egress, always safe
 * - external: needs admin opt-in for confidential data
 * - demo: deterministic mock responses, zero network — always safe
 */
export const PROVIDER_POSTURE: Record<string, 'approved' | 'local' | 'external' | 'demo'> = {
  github: 'approved',   // GitHub Models / Copilot infra — Unisys-approved
  ollama: 'local',      // 100% on-prem
  demo: 'demo',         // mock responses, no network
  groq: 'external',
  openai: 'external',
  anthropic: 'external',
  google: 'external',
  deepseek: 'external', // China-based — CISO opt-in obrigatório
};

/**
 * Core context injected into EVERY LLM call regardless of provider.
 * Ensures the model understands UnisysGuard's role, the Caixa/Unisys context,
 * and the compliance constraints, so outputs are always relevant and aligned.
 */
export const UNISYSGUARD_CORE_CONTEXT = `Você é o Motor de IA do UnisysGuard — plataforma AppSec/ASPM da Unisys que atende a Caixa Econômica Federal.

CONTEXTO PERMANENTE:
- Cliente final: Caixa Econômica Federal (banco federal brasileiro).
- Stack típica dos sistemas analisados: ASP.NET / ASP.NET Core (C#), COBOL legado, APIs REST em WSO2 API Manager, integrações com mainframe Z.
- Squads ofensivas Unisys validam mudanças DAST/SAST de squads SIACI (NM176 Recursos, NM177 Financeiro, NM180 Portais, NM181 Evolução, NM182 Originação).
- Frameworks de referência: OWASP Web Top 10 2021, OWASP API Security Top 10 2023, OWASP ASVS 4.0, NIST AI RMF, BACEN Resolução 4658, LGPD.
- Tracker oficial: IBM RTC (Rational Team Concert).

GUARDRAILS UNISYS AI P1.0:
- Toda análise é assistiva, NUNCA autônoma. Human oversight obrigatório.
- Nunca invente CVEs, CWEs, endpoints, hashes, credenciais ou métricas.
- Se não tiver dados suficientes, declare "dado não disponível".
- Output deve assumir que será revisado por pentester sênior antes de ir pra cliente.
- Em sugestões de código: nunca usar bibliotecas GPL ou copyleft.
- Em payloads de teste: apenas exemplos, pentester executa manualmente.

ESTILO:
- pt-BR técnico, sem gírias.
- Métricas concretas sempre que disponíveis.
- Cite framework + referência (ex: "OWASP ASVS V4.1.3").
`;


const CONFIG_PATH = path.join(__dirname, '../../../data/llm-config.json');

// Default: demo provider so the UI works end-to-end without API keys.
// User picks a real provider in Integrações → IA.
const DEFAULT_CONFIG: LlmConfig = process.env.GROQ_API_KEY
  ? { provider: 'groq', apiKey: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }
  : { provider: 'demo', apiKey: 'demo', model: 'unisysguard-demo' };

// Available models per provider
export const PROVIDER_MODELS: Record<string, { name: string; models: string[]; posture: 'approved' | 'local' | 'external' | 'demo' }> = {
  demo: {
    name: 'Demo (mocks pré-fabricados)',
    models: ['unisysguard-demo'],
    posture: 'demo',
  },
  github: {
    name: 'GitHub Models / Copilot (Unisys-approved)',
    models: ['gpt-4o', 'gpt-4o-mini', 'Phi-3.5-mini-instruct', 'Phi-3.5-MoE-instruct', 'Llama-3.3-70B-Instruct', 'Mistral-large-2407'],
    posture: 'approved',
  },
  ollama: {
    name: 'Ollama Local (Unisys-safe)',
    models: ['llama3.2-vision', 'llava', 'llama3', 'mistral', 'codellama', 'phi3'],
    posture: 'local',
  },
  groq: {
    name: 'Groq (External)',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    posture: 'external',
  },
  openai: {
    name: 'OpenAI (External)',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    posture: 'external',
  },
  anthropic: {
    name: 'Anthropic (External)',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    posture: 'external',
  },
  google: {
    name: 'Google Gemini (External)',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    posture: 'external',
  },
  deepseek: {
    name: 'DeepSeek (External · CISO opt-in)',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    posture: 'external',
  },
};

export function loadLlmConfig(): LlmConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(raw) as LlmConfig;
      // If saved config has no apiKey, fall back to env var for same provider
      if (!saved.apiKey && saved.provider === 'groq' && process.env.GROQ_API_KEY) {
        saved.apiKey = process.env.GROQ_API_KEY;
      }
      return saved;
    }
  } catch (e) {
    console.error('[LLM Config] Error loading config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveLlmConfig(config: LlmConfig): void {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    console.log('[LLM Config] Saved:', config.provider, config.model);
  } catch (e) {
    console.error('[LLM Config] Error saving config:', e);
    throw e;
  }
}

export function getLlmConfigSafe(): Omit<LlmConfig, 'apiKey'> & { hasApiKey: boolean } {
  const config = loadLlmConfig();
  return {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
  };
}
