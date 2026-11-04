import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { employees, findEmployee } from "./data.js";

const server = new McpServer({ name: "hr-tools", version: "1.0.0" });

function json(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    isError,
  };
}

server.registerTool(
  "get_leave_balance",
  {
    description:
      "Get one employee's annual leave in working days: days remaining (leave_remaining_days) and days already taken (leave_taken_days). Use for any question about how much leave someone has left or has taken (sisa cuti, tinggal berapa, masih berapa, jatah cuti yang masih ada, cuti yang diambil or terpakai). Not for the yearly entitlement (per tahun): that is in the policy documents.",
    inputSchema: { employee_id: z.string().describe("Employee ID, e.g. E002") },
  },
  async ({ employee_id }) => {
    const emp = findEmployee(employee_id);
    if (!emp) return json({ error: `Employee ${employee_id} not found` }, true);
    return json({
      employee_id: emp.id,
      name: emp.name,
      leave_remaining_days: emp.leaveBalanceDays,
      leave_taken_days: emp.leaveTakenDays,
    });
  },
);

server.registerTool(
  "get_subordinat_list",
  {
    description:
      "List the direct subordinates (direct reports) of a manager, with their names, titles and employee IDs. Use it to find who reports to someone, and to find an employee's ID from their name (users name people, not IDs) before checking their leave.",
    inputSchema: { employee_id: z.string().describe("Manager's employee ID, e.g. E002") },
  },
  async ({ employee_id }) => {
    const manager = findEmployee(employee_id);
    if (!manager) return json({ error: `Employee ${employee_id} not found` }, true);
    const subordinates = employees
      .filter((e) => e.managerId === manager.id)
      .map((e) => ({ employee_id: e.id, name: e.name, title: e.title }));
    return json({ manager_id: manager.id, subordinates });
  },
);

// stdout is the MCP protocol channel; log to stderr only.
await server.connect(new StdioServerTransport());
console.error("hr-tools MCP server running on stdio");
