import { runAgent } from "../agent/harness.js";
import { McpToolClient } from "../agent/mcpClient.js";
import { allToolSpecs } from "../agent/tools.js";
import { config } from "../config.js";
import { createUiServer } from "./server.js";

async function main() {
  const mcp = new McpToolClient();
  await mcp.connect();
  const tools = await allToolSpecs(mcp);

  const server = createUiServer({
    model: config.chatModel,
    run: (input, onEvent) => runAgent({ ...input, mcp, tools, onEvent }),
  });

  server.on("error", async (err: NodeJS.ErrnoException) => {
    await mcp.close();
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${config.uiPort} is already in use. Pick another one, e.g. PORT=4311 npm run ui`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  // Loopback only: the demo trusts the employee ID the page sends, so it must not be reachable from the network.
  server.listen(config.uiPort, "127.0.0.1", () => {
    console.log(`HR Assistant UI: http://localhost:${config.uiPort}  (model: ${config.chatModel}, Ctrl+C to stop)`);
  });

  process.on("SIGINT", async () => {
    server.close();
    await mcp.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
