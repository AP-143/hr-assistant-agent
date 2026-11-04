import readline from "node:readline/promises";
import { runAgent } from "./harness.js";
import type { ChatMessage } from "./llm.js";
import { McpToolClient } from "./mcpClient.js";
import { allToolSpecs } from "./tools.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return { employeeId: get("--employee-id"), ask: get("--ask") };
}

const dim = (s: string) => `\x1b[90m${s}\x1b[0m`;

async function main() {
  const { employeeId, ask } = parseArgs();
  if (!employeeId) {
    console.error('Usage: npm run chat -- --employee-id E002 [--ask "question"]');
    process.exit(1);
  }

  const mcp = new McpToolClient();
  await mcp.connect();
  const tools = await allToolSpecs(mcp);
  console.log(dim(`Connected to MCP server. Tools: ${tools.map((t) => t.function.name).join(", ")}`));

  const history: ChatMessage[] = [];
  const ask1 = async (question: string) => {
    const result = await runAgent({
      question,
      employeeId,
      mcp,
      tools,
      history,
      trace: (line) => console.log(dim(`  ${line}`)),
    });
    console.log(`\n${result.answer}\n`);
    // Keep only the final turns as memory, not the tool chatter.
    history.push({ role: "user", content: question }, { role: "assistant", content: result.answer });
  };

  try {
    if (ask) {
      await ask1(ask);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`Logged in as ${employeeId}. Type a question (Ctrl+C to quit).\n`);
    while (true) {
      const q = (await rl.question("> ")).trim();
      if (!q) continue;
      await ask1(q);
    }
  } finally {
    await mcp.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
