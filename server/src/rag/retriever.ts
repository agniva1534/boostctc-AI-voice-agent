/**
 * Cosine-similarity RAG retriever.
 * Loads vectors.json once at startup; exposes retrieve(query, k) -> top-k chunks.
 */

import { OpenAIEmbeddings } from "@langchain/openai";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { env } from "../config.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const VECTORS_FILE = resolve(__dirname, "vectors.json");

interface VectorEntry {
  id: string;
  text: string;
  embedding: number[];
  metadata: { source: string; section: string; chunkIdx: number };
}

interface VectorIndex {
  vectors: VectorEntry[];
}

export interface RetrievedChunk {
  text: string;
  score: number;
  source: string;
  section: string;
}

let _index: VectorIndex | null = null;
let _embedder: OpenAIEmbeddings | null = null;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function loadIndex(): Promise<void> {
  if (_index) return;
  try {
    const raw = await readFile(VECTORS_FILE, "utf8");
    _index = JSON.parse(raw) as VectorIndex;
    console.log(`[RAG] Loaded ${_index.vectors.length} vectors from index`);
  } catch {
    console.warn("[RAG] vectors.json not found — run 'npm run ingest' first. RAG disabled.");
    _index = { vectors: [] };
  }
  _embedder = new OpenAIEmbeddings({
    openAIApiKey: env.openaiApiKey,
    modelName: "text-embedding-3-small",
  });
}

export async function retrieve(query: string, k = 4): Promise<RetrievedChunk[]> {
  if (!_index || !_embedder) await loadIndex();
  if (!_index!.vectors.length) return [];

  const [queryEmbedding] = await _embedder!.embedDocuments([query]);

  const scored = _index!.vectors.map((v) => ({
    ...v,
    score: cosine(queryEmbedding, v.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((v) => ({
    text: v.text,
    score: v.score,
    source: v.metadata.source,
    section: v.metadata.section,
  }));
}

export function formatChunks(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return "(no relevant knowledge found)";
  return chunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n---\n\n");
}
