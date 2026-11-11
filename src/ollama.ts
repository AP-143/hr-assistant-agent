import { config } from "./config.js";

export interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type Llm = (messages: ChatMessage[], tools: ToolSpec[]) => Promise<ChatMessage>;

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

export const chat: Llm = async (messages, tools) => {
  const data = await postJson<{ message: ChatMessage }>("/api/chat", {
    model: config.chatModel,
    messages,
    tools,
    stream: false,
    think: false, // only honoured by hybrid builds; the thinking build ignores it, so use the instruct model
    options: { temperature: 0.1 },
  });
  const message = data.message;
  message.content = stripReasoning(message.content ?? "");
  return message;
};

// Thinking models leak reasoning into content, sometimes with only the closing tag.
export function stripReasoning(content: string): string {
  const closing = content.lastIndexOf("</think>");
  const answer = closing >= 0 ? content.slice(closing + "</think>".length) : content;
  return answer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function embed(texts: string[]): Promise<number[][]> {
  const data = await postJson<{ embeddings: number[][] }>("/api/embed", {
    model: config.embedModel,
    input: texts,
  });
  return data.embeddings;
}
