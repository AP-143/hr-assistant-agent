# HR Assistant Agent

A chatbot that answers employee HR questions from the company's policy documents, and can look up live data like leave balance. It runs fully on your own machine (no cloud, no API key).

**Think of a front-desk assistant** who (1) checks the rulebook for policy questions, (2) phones HR for personal data, and (3) has a supervisor who stops mistakes. In this project those are **RAG** (search the documents), **MCP tools** (a standard way for the agent to call functions), and the **harness** (safety code around the model).

```bash
ollama pull qwen3:4b-instruct && ollama pull bge-m3    # needs Node.js 22+ and Ollama
npm install && npm run ingest                          # read the HR document into the vector store
npm run chat -- --employee-id E002                     # talk to it (add --ask "..." for one question)
npm run eval                                           # 33 automatic checks, ~40 s
npm run ui                                             # optional browser demo at http://localhost:4310 (PORT=4311 to change)
```

The browser demo shows "Sedang mengetik" while the agent works, then the answer with a small badge of where it came from, and lets you switch the asking employee to try the access control. The full step-by-step trace is printed by `npm run chat`. It only answers requests addressed to localhost.

## 1. Architecture

```mermaid
flowchart LR
    U[Employee] --> A[Agent<br/>qwen3 4b instruct<br/>+ safety code]
    A -->|rules and procedures| R[search_policy<br/>RAG, bge-m3 embeddings]
    A -->|live data| M[MCP server<br/>leave balance<br/>subordinates]
    R --> V[(LanceDB)]
    D[HR documents] -->|chunk + embed| V
```

**How the agent picks:** the model sees three tools and chooses one per step. Questions about *rules* go to document search, questions about *a person's data* go to MCP, and some need both ("my leave balance and the carry-over rule"). If the documents have no answer, it gives one fixed, polite reply ("the information is not in the HR policy documents, please contact the HR team") instead of guessing. The harness enforces this: when the document search finds nothing and no HR data backs the answer, whatever the model wrote is replaced by that reply.

| Part | Choice | Why |
|---|---|---|
| LLM | `qwen3:4b-instruct` (Ollama) | HR data stays on the machine. It supports tool calling and handles Indonesian well enough. Use the `-instruct` tag: plain `qwen3:4b` is a "thinking" model that leaks its reasoning and was ~15x slower. |
| Embeddings | `bge-m3` | Understands Indonesian. It ranked the right section first for 20 of 20 test questions. |
| Vector store | LanceDB | A folder on disk, nothing to run. Enough for a few thousand chunks. |
| Tools | MCP over stdio | The agent can only call tools through the protocol, so the server can move elsewhere later. |
| Loop | Hand-written, no framework | Short and easy to trace and test. |

**The harness** is where I put everything that must not depend on the model behaving well:
- Stop after 5 steps, ignore repeated identical tool calls, time out and retry once.
- If the model answers without looking anything up, nudge it once, then run the document search for it.
- If the documents have nothing and no HR data backs the answer, replace whatever the model wrote with the polite not-covered reply.
- Fix the wording in code: the user is always "Anda" (small models copy "saya" from the question), a bare employee ID gets its name ("Sari Dewi (E003)"), and a short follow-up like "Kalau Andi?" is rewritten into a complete question first, so it is not answered from policy text with an invented number.
- Before a data tool runs, check the asker may see that person (themselves or their team). This is code, not a prompt rule, so it cannot be talked around. In the demo the employee ID is a CLI flag; in production it would come from the login session.

## 2. Trade-offs

- **Chunk = 800 characters, 100 overlap, cut at headings.** Each policy section is short and holds one rule with its numbers. Bigger chunks mix rules together; smaller ones split a rule from its exception. Cost: a little repeated text.
- **Search must score above 0.59 to count, and near misses are double-checked.** I measured it: formally worded questions scored 0.62-0.75 and off-topic ones at most 0.56. But colloquial wording ("saya ingin resigne", "kenaikan gaji kapan?") scores 0.55-0.59 while the right section is still ranked first, and off-topic questions reach 0.56, so no score cut-off can tell them apart. Scores from 0.50 to 0.59 therefore go to a one-word check by the model ("do these passages answer the question?"). On this corpus it accepted 9 of 9 covered questions and turned down 11 of 11 uncovered ones; 40 out-of-scope tries end to end were all declined. I prefer a wrongly polite "not covered" over a confident wrong answer in HR. Cost: one extra model call for near misses, and the numbers must be re-measured on the real 200-page corpus.
- **LanceDB now, pgvector later.** LanceDB needs no setup for a demo. In production pgvector keeps vectors next to existing data, with access control and backups.
- **Small local model.** Private and free, but careless: it skipped searching, compared numbers wrongly, and stopped searching once chat history was replayed (0/5 right, versus 5/5 when history is a short note). The harness fixed each one, so a bigger model is an upgrade, not a requirement.
- **Document search is a tool the model chooses**, not always-on. It saves a search for pure data questions. Cost: the model sometimes skips it, hence the forced search.

## 3. Evaluation

**Today:** `npm run eval` runs 33 checks: right section found, right fact, right tool, people asked by name, totals and "who has the most", short follow-ups ("Kalau Andi?"), colloquial wording and typos ("resigne"), wording ("Anda", never "sisa cuti saya"), the polite not-covered reply for out-of-scope and near-miss questions, and access blocked. All pass. The suite fails on the code from before the wording, routing and near-miss fixes, so it can catch regressions. It is a small smoke test, not a benchmark.

**What I would add for production:**
1. **Retrieval quality:** is the right passage in the top results? (recall@k, MRR on a few hundred labelled questions.)
2. **Groundedness:** a judge model checks every claim is backed by the retrieved text.
3. **Correctness:** HR-reviewed question/answer pairs, scored on facts, numbers and dates.
4. **Declining correctly:** how often it answers confidently when it should refuse (the key safety number).
5. **Tool use and safety:** right tool and arguments, plus a red team trying to read other people's data (target: zero leaks).
6. **Always running:** run all of this in CI on every prompt, model or document change, and track thumbs up/down, "asked HR anyway", and unanswered questions in production.

More detail for each build step is in `.scratch/hr-assistant-agent/issues/`.
