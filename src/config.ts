import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  root,
  ollamaHost: process.env.OLLAMA_HOST ?? "http://localhost:11434",
  chatModel: process.env.CHAT_MODEL ?? "qwen3:4b",
  embedModel: process.env.EMBED_MODEL ?? "bge-m3",
  topK: Number(process.env.TOP_K ?? 4),
  minSimilarity: Number(process.env.MIN_SIMILARITY ?? 0.45),
  maxIterations: Number(process.env.MAX_AGENT_ITERATIONS ?? 5),
  docPath: path.join(root, "data", "hr-policies.md"),
  dbPath: path.join(root, ".lancedb"),
  tableName: "hr_chunks",
  chunk: { maxChars: 800, overlapChars: 100 },
};
