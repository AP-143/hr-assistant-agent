// What the harness reports while it works. A caller (the CLI, the web UI) can listen to
// these instead of parsing the text trace.
export type AgentEvent =
  | { type: "tool_call"; iteration: number; name: string; args: Record<string, unknown>; source: "documents" | "hr_system" }
  | { type: "tool_result"; iteration: number; name: string; output: string }
  | { type: "blocked"; iteration: number; name: string; target: string }
  | { type: "duplicate"; iteration: number; name: string }
  | { type: "follow_up"; original: string; standalone: string }
  | { type: "nudge"; iteration: number }
  | { type: "forced_search"; iteration: number; query: string }
  | { type: "retry"; label: string; message: string }
  | { type: "iteration_limit"; max: number }
  | { type: "final"; iteration: number; answer: string };

const TRACE_RESULT_CHARS = 160;

// The one-line text form printed by the CLI. Events carry the full data; the trace is shortened.
export function traceLine(event: AgentEvent, employeeId: string): string {
  switch (event.type) {
    case "tool_call":
      return `[${event.iteration}] tool_call ${event.name} ${JSON.stringify(event.args)}`;
    case "tool_result": {
      const cut = event.output.length > TRACE_RESULT_CHARS;
      return `[${event.iteration}] tool_result ${event.output.slice(0, TRACE_RESULT_CHARS)}${cut ? "..." : ""}`;
    }
    case "blocked":
      return `[${event.iteration}] BLOCKED ${event.name}: ${employeeId} may not access ${event.target}`;
    case "duplicate":
      return `[${event.iteration}] duplicate call blocked`;
    case "follow_up":
      return `follow-up "${event.original}" understood as: "${event.standalone}"`;
    case "nudge":
      return `[${event.iteration}] answered without any tool -> nudging once`;
    case "forced_search":
      return `[${event.iteration}] still no tool -> harness runs search_policy ${JSON.stringify({ query: event.query })}`;
    case "retry":
      return `retry ${event.label}: ${event.message}`;
    case "iteration_limit":
      return `iteration limit (${event.max}) reached`;
    case "final":
      return `[${event.iteration}] final answer`;
  }
}
