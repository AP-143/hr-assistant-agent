import readline from "node:readline";
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
  const handleQuestion = async (question: string) => {
    let result;
    try {
      result = await runAgent({
        question,
        employeeId,
        mcp,
        tools,
        history,
        trace: (line) => console.log(dim(`  ${line}`)),
      });
    } catch (err) {
      // The harness already retried once; keep the session alive instead of crashing.
      console.error(`\nMaaf, terjadi kesalahan: ${(err as Error).message}\n`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${result.answer}\n`);
    // Keep only the final turns as memory, not the tool chatter.
    history.push({ role: "user", content: question }, { role: "assistant", content: result.answer });
  };

  try {
    if (ask) {
      await handleQuestion(ask);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`Logged in as ${employeeId}. Type a question (Ctrl+C to quit).\n`);
    let closed = false;
    rl.on("close", () => (closed = true));
    const prompt = () => {
      if (!closed) rl.prompt();
    };
    rl.setPrompt("> ");
    prompt();
    // Iterating lines (instead of rl.question) keeps piped input intact and ends cleanly at EOF.
    for await (const line of rl) {
      const q = line.trim();
      if (q) await handleQuestion(q);
      prompt();
    }
  } finally {
    await mcp.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
