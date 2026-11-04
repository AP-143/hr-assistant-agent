import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { postJson } from "./http.js";

describe("postJson", () => {
  let hanging: http.Server;
  let failing: http.Server;
  let echo: http.Server;
  const hostOf = (s: http.Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`;

  before(async () => {
    // Accepts the request and never answers, like a stuck model.
    hanging = http.createServer(() => {});
    failing = http.createServer((_req, res) => {
      res.statusCode = 500;
      res.end("model exploded");
    });
    echo = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => res.end(JSON.stringify({ path: req.url, received: JSON.parse(body) })));
    });
    await Promise.all([hanging, failing, echo].map((s) => new Promise<void>((r) => s.listen(0, "127.0.0.1", r))));
  });
  after(async () => {
    hanging.closeAllConnections();
    await Promise.all([hanging, failing, echo].map((s) => new Promise((r) => s.close(r))));
  });

  it("gives up on a server that never answers, with a clear message", async () => {
    const started = Date.now();
    await assert.rejects(
      postJson("/api/chat", { x: 1 }, { timeoutMs: 200, host: hostOf(hanging) }),
      /\/api\/chat timed out after 200ms/,
    );
    assert.ok(Date.now() - started < 3000, "must not wait for the server");
  });

  it("includes status and body when the server returns an error", async () => {
    await assert.rejects(
      postJson("/api/embed", {}, { timeoutMs: 1000, host: hostOf(failing) }),
      /\/api\/embed failed \(500\): model exploded/,
    );
  });

  it("posts JSON and returns the parsed response", async () => {
    const res = await postJson<{ path: string; received: { a: number } }>("/api/x", { a: 1 }, { host: hostOf(echo) });
    assert.deepEqual(res, { path: "/api/x", received: { a: 1 } });
  });
});
