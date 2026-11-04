import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { config } from "../config.js";
import type { AgentEvent } from "../agent/events.js";
import type { RunResult } from "../agent/harness.js";
import type { ChatMessage } from "../agent/llm.js";
import { directory, findInDirectory } from "../directory.js";
import { summarize } from "./summary.js";

export type AgentRunner = (
  input: { question: string; employeeId: string; history: ChatMessage[] },
  onEvent: (event: AgentEvent) => void,
) => Promise<RunResult>;

const MAX_BODY_BYTES = 64 * 1024;
const MAX_QUESTION_CHARS = 2000;
const MAX_HISTORY_ITEMS = 40;
const MAX_HISTORY_CHARS = 4000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Keep draining so the client can read our answer instead of seeing a reset connection.
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
  }
  if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large");
  return Buffer.concat(chunks).toString("utf8");
}

function parseChatRequest(raw: string): { question: string; employeeId: string; history: ChatMessage[] } {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Body must be valid JSON");
  }
  if (typeof body !== "object" || body === null) throw new HttpError(400, "Body must be a JSON object");
  const { question, employeeId, history = [] } = body as Record<string, unknown>;

  if (typeof question !== "string" || question.trim() === "") throw new HttpError(400, "question is required");
  if (question.trim().length > MAX_QUESTION_CHARS) {
    throw new HttpError(400, `question must be at most ${MAX_QUESTION_CHARS} characters`);
  }
  if (typeof employeeId !== "string" || !findInDirectory(employeeId)) throw new HttpError(400, "unknown employeeId");
  if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
    throw new HttpError(400, `history must be a list of at most ${MAX_HISTORY_ITEMS} messages`);
  }
  const cleanHistory: ChatMessage[] = history.map((m) => {
    const item = m as Record<string, unknown>;
    if ((item?.role !== "user" && item?.role !== "assistant") || typeof item.content !== "string") {
      throw new HttpError(400, "history items must have role user or assistant and a text content");
    }
    if (item.content.length > MAX_HISTORY_CHARS) throw new HttpError(400, "history message is too long");
    return { role: item.role, content: item.content };
  });

  return { question: question.trim(), employeeId, history: cleanHistory };
}

// The page may only be reached as localhost. Binding to 127.0.0.1 is not enough on its own: a
// malicious site can point its own domain at 127.0.0.1 (DNS rebinding) and then talk to us as
// if it were the page. Such requests carry the attacker's domain in the Host header.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  const hostname = hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0];
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

export function createUiServer(deps: {
  run: AgentRunner;
  model: string;
  html?: () => Promise<string>;
}): http.Server {
  const loadHtml = deps.html ?? (() => fs.readFile(path.join(config.root, "src", "ui", "index.html"), "utf8"));
  // One local model, so one question at a time.
  let busy = false;

  async function chat(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // A cross-site <form> cannot send JSON, so this blocks other pages from driving the agent.
    if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
      throw new HttpError(415, "Content-Type must be application/json");
    }
    const input = parseChatRequest(await readBody(req));
    if (busy) throw new HttpError(429, "The agent is still working on the previous question");

    busy = true;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded && !res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      const events: AgentEvent[] = [];
      const result = await deps.run(input, (event) => {
        events.push(event);
        send("agent", event);
      });
      send("done", { ...result, summary: summarize(events, result) });
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      busy = false;
      res.end();
    }
  }

  async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (!isLocalHost(req.headers.host)) throw new HttpError(403, "Host not allowed");
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    if (pathname === "/" || pathname === "/index.html") {
      if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      res.end(await loadHtml());
    } else if (pathname === "/api/info") {
      if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
      sendJson(res, 200, { model: deps.model, employees: directory });
    } else if (pathname === "/api/chat") {
      if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
      await chat(req, res);
    } else {
      throw new HttpError(404, "Not found");
    }
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      const status = err instanceof HttpError ? err.status : 500;
      if (!res.headersSent) sendJson(res, status, { error: status === 500 ? "Internal error" : err.message });
      else res.end();
      if (status === 500) console.error(err);
    });
  });
}
