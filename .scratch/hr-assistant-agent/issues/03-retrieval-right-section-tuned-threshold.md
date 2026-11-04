# 03: Retrieval returns the right section, with a tuned threshold

**What to build:** Given a question in Indonesian, top-k retrieval returns the HR section that actually answers it, and a question the documents do not cover returns no relevant chunk. The similarity threshold that separates the two is chosen from real scores, not guessed.

**Blocked by:** 01 (needs a populated vector store).

**Status:** done

- [x] For at least 8 representative questions (annual leave, sick leave, maternity, WFH, overtime, reimbursement, health benefit, resignation), the correct section is among the relevant top-k results
- [x] For at least 4 off-topic or out-of-scope questions (e.g. CEO salary, a recipe, childcare), no chunk passes the threshold
- [x] The similarity scores for both groups are printed and compared, and the chosen `MIN_SIMILARITY` sits in the gap between them with a stated margin
- [x] The default in the env example file is updated to the chosen value
- [x] If the groups cannot be separated cleanly, the finding is recorded (which questions overlap) and the chunking or top-k setting is adjusted instead of forcing the threshold

## Findings (for the README)

- Measured with bge-m3 on 17 chunks: correct chunk scored 0.617-0.748 over 20 queries (formal, colloquial, keyword-style), all at rank 1. Out-of-scope best chunk scored 0.310-0.564 over 6 queries. The closest off-topic query was childcare (0.564), which sits near the health-benefit section.
- Chosen MIN_SIMILARITY=0.59, the midpoint of the gap. The margin is only about 0.03 on each side, so a larger real corpus needs re-measuring (and likely a reranker or a cross-encoder check on borderline scores).
- Design change: the threshold now gates on the best chunk only. Chunks ranked 2-4 usually score below 0.59 even when they matter for a multi-section question, so filtering each chunk would silently drop them. Once the gate passes, all top-k are returned.
- The sample document has no section above 452 characters, so the split-and-overlap path of the chunker is not exercised by it.
