import { config } from "../config.js";

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

export async function chat(messages: ChatMessage[], tools: ToolSpec[]): Promise<ChatMessage> {
  const res = await fetch(`${config.ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.chatModel,
      messages,
      tools,
      stream: false,
      think: false, // skip qwen3's reasoning pass: much faster on CPU
      options: { temperature: 0.1 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama chat failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { message: ChatMessage };
  const message = data.message;
  // Some models still leak <think> blocks into the content.
  message.content = (message.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return message;
}
