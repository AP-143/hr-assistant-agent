import * as lancedb from "@lancedb/lancedb";
import { config } from "../config.js";
import { embed } from "../ollama.js";
import type { Chunk } from "./chunk.js";

export interface RetrievedChunk {
  heading: string;
  text: string;
  similarity: number;
}

export async function saveChunks(chunks: Chunk[], vectors: number[][]): Promise<void> {
  const db = await lancedb.connect(config.dbPath);
  const rows = chunks.map((c, i) => ({ id: c.id, heading: c.heading, text: c.text, vector: vectors[i] }));
  // Overwrite so re-running ingest is idempotent.
  await db.createTable(config.tableName, rows, { mode: "overwrite" });
}

// The best chunk gates coverage; once it passes, return all top-k (later sections score lower).
export async function retrieve(
  query: string,
  k: number = config.topK,
  minSimilarity: number = config.minSimilarity,
): Promise<{ relevant: RetrievedChunk[]; all: RetrievedChunk[] }> {
  const [queryVector] = await embed([query]);
  const db = await lancedb.connect(config.dbPath);
  const table = await db.openTable(config.tableName);
  const results = await table.vectorSearch(queryVector).distanceType("cosine").limit(k).toArray();
  const all = results.map((r) => ({
    heading: String(r.heading),
    text: String(r.text),
    // LanceDB returns cosine distance; convert to similarity.
    similarity: 1 - Number(r._distance),
  }));
  const gatePasses = all.length > 0 && all[0].similarity >= minSimilarity;
  return { all, relevant: gatePasses ? all : [] };
}
