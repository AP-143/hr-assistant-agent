import * as lancedb from "@lancedb/lancedb";
import { config } from "../config.js";
import type { Chunk } from "./chunk.js";

export type StoredRow = {
  id: string;
  heading: string;
  text: string;
  vector: number[];
};

export async function saveChunks(chunks: Chunk[], vectors: number[][]): Promise<void> {
  const db = await lancedb.connect(config.dbPath);
  const rows: StoredRow[] = chunks.map((c, i) => ({
    id: c.id,
    heading: c.heading,
    text: c.text,
    vector: vectors[i],
  }));
  // Overwrite so re-running ingest is idempotent.
  await db.createTable(config.tableName, rows, { mode: "overwrite" });
}

export async function searchVectors(
  queryVector: number[],
  k: number,
): Promise<Array<{ id: string; heading: string; text: string; similarity: number }>> {
  const db = await lancedb.connect(config.dbPath);
  const table = await db.openTable(config.tableName);
  const results = await table
    .vectorSearch(queryVector)
    .distanceType("cosine")
    .limit(k)
    .toArray();

  return results.map((r) => ({
    id: String(r.id),
    heading: String(r.heading),
    text: String(r.text),
    // LanceDB returns cosine distance; convert to similarity.
    similarity: 1 - Number(r._distance),
  }));
}
