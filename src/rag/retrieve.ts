import { config } from "../config.js";
import { embed } from "./ollama.js";
import { searchVectors } from "./store.js";

export interface RetrievedChunk {
  heading: string;
  text: string;
  similarity: number;
}

// Top-k retrieval. Chunks under the similarity threshold are dropped, so an empty
// result means "the documents do not cover this question" (the guardrail signal).
export async function retrieve(
  query: string,
  k: number = config.topK,
  minSimilarity: number = config.minSimilarity,
): Promise<{ relevant: RetrievedChunk[]; all: RetrievedChunk[] }> {
  const [queryVector] = await embed([query]);
  const all = await searchVectors(queryVector, k);
  return { all, relevant: all.filter((c) => c.similarity >= minSimilarity) };
}
