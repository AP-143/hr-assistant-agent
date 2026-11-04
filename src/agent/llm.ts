import { config } from "../config.js";
import { postJson } from "../http.js";

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
}

// Thinking models can leak their reasoning into `content`, sometimes with only the
// closing tag (the opening <think> is injected by the chat template). Keep what follows
// the last </think>.
export function stripReasoning(content: string): string {
  const closing = content.lastIndexOf("</think>");
  const answer = closing >= 0 ? content.slice(closing + "</think>".length) : content;
  return answer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
