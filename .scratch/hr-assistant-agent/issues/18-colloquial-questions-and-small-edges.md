# 18: Colloquial questions and small edges

**What to build:** People ask HR questions the way they talk: slang, English loanwords, typos. "saya ingin resigne" must be answered from the resignation procedure just like "saya ingin mengundurkan diri". Small rough edges around the agent (a bad employee ID, an empty model reply, raw error messages) are smoothed out too.

**Blocked by:** 17 (answers that read right).

**Status:** done

- [x] Colloquial, misspelled and English questions about every policy section are answered from the documents
- [x] Questions that are NOT in the documents, including ones that look like something that is (yearly bonus vs THR, severance vs resignation), are still declined with the fixed polite reply
- [x] A refusal the model writes in its own words gets the same fixed reply and badge
- [x] An unknown employee ID is rejected by the command-line chat; IDs are matched without regard to case or spaces
- [x] The model returning an empty reply never leaves a blank answer
- [x] Network and model errors in the page are short Indonesian sentences that say what to do
- [x] Permanent eval cases for all of the above

## How it was found

The user sent a screenshot: "saya ingin resigne" was answered "not in the documents", while "saya ingin mengundurkan diri" was answered correctly. Instead of adding one synonym, 36 questions written the way people really ask (slang, typos, English, one per policy section) were run: 28 of 36 passed.

The scores explained it. In all 9 failing cases the right section was ranked first; the question just scored 0.556 to 0.587, under the 0.59 gate. Off-topic questions reach 0.564 ("penitipan anak"), and the top-versus-second margin overlaps as well, so no number could separate them (for example "kenaikan gaji kapan?" 0.558 is a twin of "berapa gaji karyawan baru?" 0.553).

## What was done

- Scores from 0.50 up to the 0.59 gate are a near miss: the model is asked one question, "do these passages answer the question?". Prototype first: it accepted 9 of 9 covered questions and rejected 11 of 11 uncovered ones, then it was built with tests. A failing or unclear check counts as "no", so it can only add answers that the model confirms, never let one through by accident.
- The judge reads the user's own question, not the search query the model wrote, and only runs for near misses (no extra call for clear hits or clear misses).
- Result: colloquial battery 28/36 to 72/72; 40 out-of-scope questions end to end, 0 answered (it was 2, both refusals in the model's own words, now normalised); wording and routing checks 78/78; eval 33/33 three times in a row.

## Small things found on the way

- `npm run chat -- --employee-id E999` chatted as a person who does not exist; it now stops with the list of valid IDs. `e002` is treated as `E002` everywhere (the prompt used to say "employee e002").
- An empty or whitespace-only model reply produced a blank bubble; it now gives the safe fallback.
- The page showed the browser's raw "Failed to fetch" (English) when the server was down; it now says that it cannot reach the server and what to run.
- The page asked the browser for a favicon that does not exist (a 404 on every load); it now declares an empty icon.

## Notes

- Not verified in a browser: the error-message wording and the favicon line were checked by parsing the page script and running the message function with the real error shapes, because the demo server was stopped by the system (low memory) and was not restarted.
- The 0.50 lower bound is a measured choice: the lowest covered question scored 0.556, the highest off-topic question 0.571. On the real 200-page corpus these numbers must be measured again; the judge makes that less brittle than a bare cut-off, but it does not remove the need.
