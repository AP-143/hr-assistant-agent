import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  root,
  ollamaHost: process.env.OLLAMA_HOST ?? "http://localhost:11434",
  chatModel: process.env.CHAT_MODEL ?? "qwen3:4b-instruct",
  embedModel: process.env.EMBED_MODEL ?? "bge-m3",
  topK: Number(process.env.TOP_K ?? 4),
  minSimilarity: Number(process.env.MIN_SIMILARITY ?? 0.59),
  // From here up to minSimilarity the model judges whether the passages answer the question.
  borderlineSimilarity: Number(process.env.BORDERLINE_SIMILARITY ?? 0.5),
  maxIterations: Number(process.env.MAX_AGENT_ITERATIONS ?? 5),
  uiPort: Number(process.env.PORT ?? 4310),
  // Generous because the first request after idle includes loading the model on CPU.
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 120_000),
  toolTimeoutMs: Number(process.env.TOOL_TIMEOUT_MS ?? 30_000),
  docPath: path.join(root, "data", "hr-policies.md"),
  dbPath: path.join(root, ".lancedb"),
  tableName: "hr_chunks",
  chunk: { maxChars: 800, overlapChars: 100 },
};
