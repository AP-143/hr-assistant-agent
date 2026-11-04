import { config } from "../config.js";
import { embed } from "./ollama.js";
import { searchVectors } from "./store.js";

export interface RetrievedChunk {
  heading: string;
  text: string;
  similarity: number;
}

// Top-k retrieval with a relevance gate. The best chunk decides whether the documents
// cover the question at all: below the threshold `relevant` is empty (the "tidak tahu"
// signal). Once the gate passes, all top-k chunks are returned, because the 2nd and 3rd
// chunk of a multi-section question usually score lower than the threshold themselves.
export async function retrieve(
  query: string,
  k: number = config.topK,
  minSimilarity: number = config.minSimilarity,
): Promise<{ relevant: RetrievedChunk[]; all: RetrievedChunk[] }> {
  const [queryVector] = await embed([query]);
  const all = await searchVectors(queryVector, k);
  const gatePasses = all.length > 0 && all[0].similarity >= minSimilarity;
  return { all, relevant: gatePasses ? all : [] };
}
