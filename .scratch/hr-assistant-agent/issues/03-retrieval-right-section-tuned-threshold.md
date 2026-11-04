# 03: Retrieval returns the right section, with a tuned threshold

**What to build:** Given a question in Indonesian, top-k retrieval returns the HR section that actually answers it, and a question the documents do not cover returns no relevant chunk. The similarity threshold that separates the two is chosen from real scores, not guessed.

**Blocked by:** 01 (needs a populated vector store).

**Status:** ready-for-agent

- [ ] For at least 8 representative questions (annual leave, sick leave, maternity, WFH, overtime, reimbursement, health benefit, resignation), the correct section is among the relevant top-k results
- [ ] For at least 4 off-topic or out-of-scope questions (e.g. CEO salary, a recipe, childcare), no chunk passes the threshold
- [ ] The similarity scores for both groups are printed and compared, and the chosen `MIN_SIMILARITY` sits in the gap between them with a stated margin
- [ ] The default in the env example file is updated to the chosen value
- [ ] If the groups cannot be separated cleanly, the finding is recorded (which questions overlap) and the chunking or top-k setting is adjusted instead of forcing the threshold
