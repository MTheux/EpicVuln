import fs from 'fs';
import path from 'path';

export interface LlmConfig {
  provider: 'groq' | 'openai' | 'anthropic' | 'google' | 'ollama';
  apiKey: string;
  model: string;
  baseUrl?: string; // For Ollama or custom endpoints
}

const CONFIG_PATH = path.join(__dirname, '../../../data/llm-config.json');

const DEFAULT_CONFIG: LlmConfig = {
  provider: 'groq',
  apiKey: process.env.GROQ_API_KEY || '',
  model: 'llama-3.3-70b-versatile',
};

// Available models per provider
export const PROVIDER_MODELS: Record<string, { name: string; models: string[] }> = {
  groq: {
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  google: {
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['llama3', 'mistral', 'codellama', 'phi3'],
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
