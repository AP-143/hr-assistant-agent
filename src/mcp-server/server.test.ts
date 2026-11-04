import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { McpToolClient } from "../agent/mcpClient.js";

// These tests talk to the server only through the MCP protocol (stdio child process).
describe("hr-tools MCP server", () => {
  const mcp = new McpToolClient();

  before(async () => {
    await mcp.connect();
  });
  after(async () => {
    await mcp.close();
  });

  it("lists exactly the two tools with descriptions and input schemas", async () => {
    const tools = await mcp.listTools();
    assert.deepEqual(tools.map((t) => t.function.name).sort(), ["get_leave_balance", "get_subordinat_list"]);
    for (const t of tools) {
      assert.ok(t.function.description.length > 0, `${t.function.name} needs a description`);
      assert.deepEqual(t.function.parameters.required, ["employee_id"]);
    }
  });

  it("get_leave_balance returns remaining and taken days", async () => {
    const { text, isError } = await mcp.callTool("get_leave_balance", { employee_id: "E002" });
    assert.equal(isError, false);
    assert.deepEqual(JSON.parse(text), {
      employee_id: "E002",
      name: "Budi Santoso",
      leave_remaining_days: 7,
      leave_taken_days: 5,
    });
  });

  it("get_subordinat_list returns direct reports", async () => {
    const { text, isError } = await mcp.callTool("get_subordinat_list", { employee_id: "E002" });
    assert.equal(isError, false);
    const ids = JSON.parse(text).subordinates.map((s: { employee_id: string }) => s.employee_id);
    assert.deepEqual(ids, ["E003", "E004", "E005"]);
  });

  it("get_subordinat_list returns an empty list for someone without reports", async () => {
    const { text, isError } = await mcp.callTool("get_subordinat_list", { employee_id: "E003" });
    assert.equal(isError, false);
    assert.deepEqual(JSON.parse(text).subordinates, []);
  });

  it("returns a tool-level error for an unknown employee and keeps serving", async () => {
    for (const tool of ["get_leave_balance", "get_subordinat_list"]) {
      const { text, isError } = await mcp.callTool(tool, { employee_id: "E999" });
      assert.equal(isError, true);
      assert.match(JSON.parse(text).error, /not found/);
    }
    // The server survived the errors above.
    const after = await mcp.callTool("get_leave_balance", { employee_id: "E001" });
    assert.equal(after.isError, false);
  });

  it("accepts lowercase IDs with surrounding spaces", async () => {
    const { text, isError } = await mcp.callTool("get_leave_balance", { employee_id: " e004 " });
    assert.equal(isError, false);
    assert.equal(JSON.parse(text).leave_remaining_days, 4);
  });
});
