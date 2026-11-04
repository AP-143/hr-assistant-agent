import { config } from "../config.js";

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${config.ollamaHost}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.embedModel, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`Ollama embed failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}
