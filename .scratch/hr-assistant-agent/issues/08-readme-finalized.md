# 08: README finalized with real results

**What to build:** A reviewer can open the README, understand the architecture and the trade-offs, and reproduce the demo on a clean machine. Every number and claim in it matches what the system actually does.

**Blocked by:** 07.

**Status:** done

- [x] The architecture diagram renders and shows all main components, their relations, and how the agent chooses between document search and MCP tools
- [x] Each component choice (LLM, embeddings, vector store, MCP transport, no framework) has a 2-3 sentence justification
- [x] Trade-offs (chunk size and overlap, top-k, threshold, small local model, LanceDB versus pgvector) reflect the values and findings from tickets 03 and 07
- [x] The evaluation section matches the cases that exist and reports the real result, and the production eval plan is included
- [x] The example session in the README is real output from a run, not invented
- [x] The quick-start steps are followed once from scratch (pull models, install, ingest, chat, eval) and work as written
- [x] Everything written to the repository is in English, except the sample HR document and the agent's runtime answers

## Verification notes

- Diagram: parsed with the real Mermaid parser (flowchart OK); a deliberately broken diagram is rejected by the same check, so the check can fail.
- Numbers in the README were re-checked against measurements: 20/20 in-scope queries at rank 1, similarity ranges, eval 13/13 in 11-18 s, 51 tests, harness under 200 lines. Three wrong claims were found and fixed while checking (a "30 of 30" that should be 20 of 20, a loop length, and a trace example that ignored the prepended previous question).
- Quick start: followed from a fresh `git clone` of the committed state (no node_modules, no vector store, no .env): `npm ci`, typecheck, `npm run ingest` (17 chunks), `npm run chat -- --ask`, `npm run eval` (13/13) and `npm test` (51/51) all passed. The Ollama models were already pulled on this machine, so the two `ollama pull` lines were not re-timed.
- The session shown in the README is real output; leave and policy answers are shortened with `...` where they were long.
- The real-session check found the conversation-history problem (see README section 4, item 5), which the single-question eval cannot see.
