import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { loadLlmConfig } from '../llm/llm-config';

/**
 * RAG (Retrieval-Augmented Generation) service.
 *
 * Ingestão:
 *  1. Recebe texto (de PDF/TXT/MD extraído upstream)
 *  2. Chunking por parágrafos com overlap
 *  3. Embedding (Ollama nomic-embed-text local OR OpenAI OR mock deterministic)
 *  4. Persiste em tabela knowledge_chunks (raw SQL, pgvector)
 *
 * Query:
 *  1. Embed query
 *  2. Cosine similarity top-K via pgvector
 *  3. Retorna chunks pra injeção no system prompt das skills
 *
 * Dimensão: 384 (nomic-embed-text é 768, mas comprimimos pra 384 via slice
 * pra manter compatibilidade com mock embedding. Pra produção real,
 * aumentar pra 768 alinhado ao modelo escolhido).
 */

const prisma = new PrismaClient();
const EMBEDDING_DIM = 384;
const CHUNK_SIZE = 800; // chars
const CHUNK_OVERLAP = 150;

/**
 * SQL bootstrap — chamado uma vez no startup pra garantir extension + table.
 */
export async function bootstrapRag(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_name      TEXT NOT NULL,
        doc_id        TEXT NOT NULL,
        chunk_index   INT NOT NULL,
        content       TEXT NOT NULL,
        content_hash  TEXT NOT NULL,
        embedding     vector(${EMBEDDING_DIM}),
        organization_id TEXT,
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_kc_doc_id ON knowledge_chunks(doc_id)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_kc_org ON knowledge_chunks(organization_id)`);
    // ivfflat index — bom até ~1M rows. Pra mais, trocar pra hnsw.
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_kc_embedding ON knowledge_chunks
      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `).catch(() => {/* requer dados — ignora em DB vazio */});
    console.log('[RAG] pgvector + knowledge_chunks ready');
  } catch (e: any) {
    console.error('[RAG] bootstrap failed:', e.message);
  }
}

// ===== Chunking =====
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= size) return [cleaned];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + size, cleaned.length);
    chunks.push(cleaned.slice(start, end));
    if (end === cleaned.length) break;
    start = end - overlap;
  }
  return chunks;
}

// ===== Embedding =====
/**
 * Embed via Ollama (default), OpenAI fallback, ou mock deterministic.
 * Mock embedding é vector hash-based — não é semântico, mas deterministic
 * (mesmo texto → mesmo vector). Útil pra testes sem dependência externa.
 */
async function embed(text: string): Promise<number[]> {
  const config = loadLlmConfig();

  // OpenAI embedding (text-embedding-3-small é 1536d — comprimir pra 384)
  if (config.provider === 'openai' && config.apiKey) {
    try {
      const r = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: EMBEDDING_DIM }),
      });
      if (r.ok) {
        const data: any = await r.json();
        return data.data[0].embedding;
      }
    } catch {}
  }

  // Ollama embedding (nomic-embed-text é 768d — sliced pra 384)
  try {
    const baseUrl = config.baseUrl || 'http://host.docker.internal:11434';
    const r = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    });
    if (r.ok) {
      const data: any = await r.json();
      if (Array.isArray(data.embedding)) {
        // Slice down to EMBEDDING_DIM
        const v = data.embedding.slice(0, EMBEDDING_DIM);
        while (v.length < EMBEDDING_DIM) v.push(0);
        return v;
      }
    }
  } catch {}

  // Deterministic mock — hash-based, not semantic, but stable.
  return mockEmbed(text);
}

function parsePgVector(s: string): number[] {
  // pgvector text format: '[0.1,0.2,...]'
  if (!s) return [];
  return s.replace(/^\[|\]$/g, '').split(',').map((x) => Number(x));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function mockEmbed(text: string): number[] {
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (const tok of tokens) {
    const hash = crypto.createHash('md5').update(tok).digest();
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] += (hash[i % hash.length] - 128) / 128;
    }
  }
  // Normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// Format JS number[] as pgvector literal: '[0.1,0.2,...]'
function toVectorLiteral(v: number[]): string {
  return '[' + v.map((x) => x.toFixed(6)).join(',') + ']';
}

// ===== Public API =====
export interface IngestResult {
  docId: string;
  docName: string;
  chunkCount: number;
  embedder: string;
}

export async function ingestText(opts: {
  docName: string;
  text: string;
  organizationId?: string | null;
}): Promise<IngestResult> {
  const { docName, text, organizationId } = opts;
  const docId = crypto.randomUUID();
  const chunks = chunkText(text);
  const config = loadLlmConfig();
  const embedder = config.provider === 'openai' && config.apiKey ? 'openai-3-small'
    : (await embedderAvailable('ollama')) ? 'ollama-nomic-embed-text'
    : 'mock-deterministic';

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    const contentHash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const vec = await embed(content);
    const vecLit = toVectorLiteral(vec);
    await prisma.$executeRawUnsafe(
      `INSERT INTO knowledge_chunks (doc_name, doc_id, chunk_index, content, content_hash, embedding, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
      docName, docId, i, content, contentHash, vecLit, organizationId ?? null,
    );
  }

  return { docId, docName, chunkCount: chunks.length, embedder };
}

export interface QueryResult {
  docId: string;
  docName: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export async function querySimilar(opts: {
  query: string;
  topK?: number;
  organizationId?: string | null;
}): Promise<QueryResult[]> {
  const { query, topK = 5 } = opts;
  const vec = await embed(query);
  const vecLit = toVectorLiteral(vec);

  // Compute similarity in JS instead of SQL — bypasses pgvector operator binding issues
  // that vary between Prisma raw query drivers. With pgvector storage but JS compute,
  // we get correct results regardless of how Prisma serializes the vector.
  const rawRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT doc_id, doc_name, chunk_index, content, embedding::text AS embedding_text FROM knowledge_chunks`,
  );
  const scored = rawRows
    .map((r) => {
      const storedVec = parsePgVector(r.embedding_text);
      const sim = cosineSimilarity(vec, storedVec);
      return {
        doc_id: r.doc_id,
        doc_name: r.doc_name,
        chunk_index: r.chunk_index,
        content: r.content,
        similarity: sim,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(1, Math.min(50, Math.floor(topK))));
  const rows = scored;
  console.log('[RAG] query rows:', rows.length, 'top sim:', rows[0]?.similarity?.toFixed(3));

  return rows.map((r) => ({
    docId: r.doc_id,
    docName: r.doc_name,
    chunkIndex: r.chunk_index,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

export interface DocSummary {
  docId: string;
  docName: string;
  chunkCount: number;
  createdAt: string;
}

export async function listDocs(_organizationId?: string | null): Promise<DocSummary[]> {
  const sql = `SELECT doc_id, doc_name, COUNT(*)::int AS chunk_count, MIN(created_at) AS created_at
               FROM knowledge_chunks
               GROUP BY doc_id, doc_name
               ORDER BY MIN(created_at) DESC`;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  return rows.map((r) => ({
    docId: r.doc_id,
    docName: r.doc_name,
    chunkCount: Number(r.chunk_count),
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
  }));
}

export async function deleteDoc(docId: string): Promise<number> {
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM knowledge_chunks WHERE doc_id = $1`,
    docId,
  );
  return Number(result);
}

async function embedderAvailable(_provider: 'ollama'): Promise<boolean> {
  try {
    const config = loadLlmConfig();
    const baseUrl = config.baseUrl || 'http://host.docker.internal:11434';
    const r = await fetch(`${baseUrl}/api/tags`);
    return r.ok;
  } catch {
    return false;
  }
}
