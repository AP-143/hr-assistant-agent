# 01: Local runtime ready: Ollama, models, and a working ingest

**What to build:** A developer on this machine can run the whole stack locally. Ollama is installed and serving, the chat model (`qwen3:4b`) and the embedding model (`bge-m3`) are pulled, and `npm run ingest` chunks the sample HR document, embeds it, and stores the chunks in the vector store.

**Blocked by:** None (can start immediately). The Ollama install via winget is already running in the background.

**Status:** done

- [x] `ollama` is on PATH and the server answers on the configured host
- [x] Both models appear in the Ollama model list
- [x] `npm run ingest` completes without errors and reports the number of chunks stored
- [x] Re-running `npm run ingest` is idempotent (same chunk count, no duplicates)
- [x] The chunk count and a few sample chunks (heading path + text) are looked at by eye: no section is cut mid-rule and every chunk carries its heading path
