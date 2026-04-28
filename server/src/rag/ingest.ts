/**
 * Ingestion script: walks knowledge_base/**\/*.md, chunks each file,
 * embeds with text-embedding-3-small, writes src/rag/vectors.json.
 *
 * Run with: npm run ingest
 */

import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KB_DIR = resolve(__dirname, "../../../knowledge_base");
const OUT_FILE = resolve(__dirname, "vectors.json");
const CHUNK_SIZE = 500; // approximate tokens (chars / 4 ≈ tokens)

interface VectorEntry {
  id: string;
  text: string;
  embedding: number[];
  metadata: {
    source: string;
    section: string;
    chunkIdx: number;
  };
}

async function walkMd(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walkMd(full)));
    } else if (e.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function chunkText(text: string, size: number): string[] {
  // Split on double newlines (paragraphs) and reassemble into size-bounded chunks
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > size && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY not set in environment");
    process.exit(1);
  }

  const embedder = new OpenAIEmbeddings({
    openAIApiKey: apiKey,
    modelName: "text-embedding-3-small",
  });

  const files = await walkMd(KB_DIR);
  console.log(`Found ${files.length} markdown files in knowledge_base/`);

  const entries: VectorEntry[] = [];

  for (const file of files) {
    const relPath = relative(KB_DIR, file);
    const raw = await readFile(file, "utf8");
    const chunks = chunkText(raw, CHUNK_SIZE * 4); // rough char estimate

    console.log(`  ${relPath}: ${chunks.length} chunk(s)`);

    // Extract top-level section heading if present
    const headingMatch = raw.match(/^#\s+(.+)/m);
    const section = headingMatch ? headingMatch[1].trim() : relPath;

    const texts = chunks.map((c) => `[${section}]\n${c}`);
    const embeddings = await embedder.embedDocuments(texts);

    for (let i = 0; i < chunks.length; i++) {
      entries.push({
        id: `${relPath.replace(/[^a-z0-9]/gi, "_")}_${i}`,
        text: texts[i],
        embedding: embeddings[i],
        metadata: { source: relPath, section, chunkIdx: i },
      });
    }
  }

  await writeFile(OUT_FILE, JSON.stringify({ vectors: entries }, null, 2), "utf8");
  console.log(`\nWrote ${entries.length} vectors to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
