import { config } from "../config.js";
import { postJson } from "../http.js";

export async function embed(texts: string[]): Promise<number[][]> {
  const data = await postJson<{ embeddings: number[][] }>("/api/embed", {
    model: config.embedModel,
    input: texts,
  });
  return data.embeddings;
}
