import { config } from "./config.js";

// POST JSON to Ollama with a hard timeout, so a stuck model cannot hang the agent forever.
export async function postJson<T>(
  path: string,
  body: unknown,
  opts: { timeoutMs?: number; host?: string } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? config.requestTimeoutMs;
  const host = opts.host ?? config.ollamaHost;

  let res: Response;
  try {
    res = await fetch(`${host}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if ((err as Error).name === "TimeoutError") {
      throw new Error(`Ollama request to ${path} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
  if (!res.ok) {
    throw new Error(`Ollama request to ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}
