import { allToolSpecs } from "../agent/tools.js";
import { runAgent } from "../agent/harness.js";
import { McpToolClient } from "../agent/mcpClient.js";
import { retrieve } from "../rag/retrieve.js";
import { cases, type AgentCase, type RetrievalCase } from "./cases.js";

async function runRetrieval(c: RetrievalCase): Promise<string[]> {
  const { relevant } = await retrieve(c.query);
  const failures: string[] = [];
  if (c.expectHeading) {
    if (!relevant.some((r) => r.heading.includes(c.expectHeading!))) {
      failures.push(`expected heading "${c.expectHeading}" in top-k, got [${relevant.map((r) => r.heading).join(" | ")}]`);
    }
  } else if (relevant.length > 0) {
    failures.push(`expected no relevant chunk, got ${relevant.length} (best ${relevant[0].similarity.toFixed(2)})`);
  }
  return failures;
}

async function runAgentCase(
  c: AgentCase,
  mcp: McpToolClient,
  tools: Awaited<ReturnType<typeof allToolSpecs>>,
): Promise<string[]> {
  const r = await runAgent({ question: c.question, employeeId: c.employeeId, mcp, tools });
  const failures: string[] = [];

  for (const t of c.expectTools ?? []) {
    if (!r.toolsCalled.includes(t)) failures.push(`expected tool ${t}, called [${r.toolsCalled.join(", ")}]`);
  }
  for (const t of c.forbidTools ?? []) {
    if (r.toolsCalled.includes(t)) failures.push(`forbidden tool ${t} was called`);
  }
  for (const re of c.answerMatches ?? []) {
    if (!re.test(r.answer)) failures.push(`answer does not match ${re}`);
  }
  for (const re of c.answerMustNotMatch ?? []) {
    if (re.test(r.answer)) failures.push(`answer must not match ${re}`);
  }
  if (c.expectBlocked && r.blocked.length === 0) failures.push("expected an authorization block");
  if (c.expectNotBlocked && r.blocked.length > 0) failures.push("unexpected authorization block");
  if (c.expectNotCovered !== undefined && r.notCovered !== c.expectNotCovered) {
    failures.push(`expected notCovered=${c.expectNotCovered}, got ${r.notCovered}`);
  }
  if (failures.length > 0) failures.push(`answer was: ${r.answer.replace(/\s+/g, " ").slice(0, 200)}`);
  return failures;
}

async function main() {
  const mcp = new McpToolClient();
  await mcp.connect();
  const tools = await allToolSpecs(mcp);

  let passed = 0;
  const started = Date.now();
  for (const c of cases) {
    const t0 = Date.now();
    let failures: string[];
    try {
      failures = c.kind === "retrieval" ? await runRetrieval(c) : await runAgentCase(c, mcp, tools);
    } catch (err) {
      failures = [`threw: ${(err as Error).message}`];
    }
    const ok = failures.length === 0;
    if (ok) passed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    failures.forEach((f) => console.log(`        - ${f}`));
  }
  await mcp.close();

  console.log(`\n${passed}/${cases.length} passed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  process.exit(passed === cases.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
