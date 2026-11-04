import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { config } from "../config.js";
import type { ToolSpec } from "./llm.js";

export class McpToolClient {
  private client = new Client({ name: "hr-agent", version: "1.0.0" });

  // The agent talks to the server only through the MCP protocol (stdio child process).
  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", path.join(config.root, "src", "mcp-server", "server.ts")],
      cwd: config.root,
      stderr: "ignore",
    });
    await this.client.connect(transport);
  }

  async listTools(): Promise<ToolSpec[]> {
    const { tools } = await this.client.listTools();
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean }> {
    const result = await this.client.callTool({ name, arguments: args });
    const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
    const text = content.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("\n");
    return { text, isError: Boolean(result.isError) };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
