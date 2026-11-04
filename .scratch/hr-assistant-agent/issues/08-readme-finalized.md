# 08: README finalized with real results

**What to build:** A reviewer can open the README, understand the architecture and the trade-offs, and reproduce the demo on a clean machine. Every number and claim in it matches what the system actually does.

**Blocked by:** 07.

**Status:** ready-for-agent

- [ ] The architecture diagram renders and shows all main components, their relations, and how the agent chooses between document search and MCP tools
- [ ] Each component choice (LLM, embeddings, vector store, MCP transport, no framework) has a 2-3 sentence justification
- [ ] Trade-offs (chunk size and overlap, top-k, threshold, small local model, LanceDB versus pgvector) reflect the values and findings from tickets 03 and 07
- [ ] The evaluation section matches the cases that exist and reports the real result, and the production eval plan is included
- [ ] The example session in the README is real output from a run, not invented
- [ ] The quick-start steps are followed once from scratch (pull models, install, ingest, chat, eval) and work as written
- [ ] Everything written to the repository is in English, except the sample HR document and the agent's runtime answers
