# 17: Answers that read right: wording, names, follow-ups

**What to build:** Answers sound like a colleague talking to the user, name the people they talk about, and stay correct for the ways people really ask: by name, by "tinggal berapa", by "Kalau Andi?" after the previous question. A user who asks "Sisa cuti saya berapa hari?" is never told "sisa cuti saya", and nothing is answered with a number taken from the policy text.

**Blocked by:** 16 (quiet answers).

**Status:** done

- [x] The assistant never calls the user's own leave, team or manager "mine"; it says "Anda"
- [x] People are shown with their name and ID ("Sari Dewi (E003)"), also when the user gave only the ID
- [x] A colleague named instead of given by ID is found through the team list; a name outside the user's team is reported as not found, not guessed
- [x] Leave already taken, leave left ("tinggal berapa"), totals and "who has the most" are answered from the leave data, with the right label for the question (lowest, highest, total)
- [x] The yearly entitlement is still answered from the policy, not from the balance
- [x] A short follow-up is rewritten into a complete question first; it never gets an invented number
- [x] No tool can name someone's manager, and the assistant does not answer that from the team list
- [x] English questions find the Indonesian policy; greetings carry no emoji
- [x] Each of these is a permanent eval case that fails on the previous code

## How it was found

A user pointed at one answer ("sisa cuti saya 7 hari"). Instead of fixing only that sentence, 25 differently phrased questions were run against the real agent and every answer was read, then re-measured with a script after each change (3 to 4 runs per question, answers checked by rule).

| What was wrong | Measured before | After |
|---|---|---|
| "Sisa cuti saya adalah 7 hari" (two-part question) | 0/3 | fixed by wording rule plus a code guard |
| Cuti already taken answered "not in the documents" | 0/3 | 4/4 |
| A person asked by name: "not in the documents" | 0/3 | 4/4 |
| "Who took the most leave" answered with "Paling sedikit" (wrong person) | 0/3 | 4/4 |
| "Total of the team" answered with the lowest instead | 0/3 | 4/4 |
| "E003 memiliki ..." without the name | 0/3 | 4/4 |
| "Cuti saya tinggal berapa hari ya?" answered from policy text (the 7 came from "7 hari kerja") | 0/3 | 4/4 |
| "Siapa atasan saya?" answered with the user's reports ("Anda adalah atasan Sari...") | 0/3 | 4/4 |
| Emoji in the greeting | 0/3 | 4/4 |
| Short follow-ups ("Kalau Andi?") answered with invented numbers (5 days instead of 4) | 4/16 | 16/16 |

Whole script: 15/36 at the start, 88/88 after the first round of fixes, then the follow-up checks (16/16).

## Notes

- Two fixes caused a new problem that the measurements caught: listing "jatah" (allotment) as a leave-left word sent "How many days of annual leave am I entitled to per year?" to the balance tool and answered 7 instead of 12; the trigger words were narrowed ("per tahun", "setahun" mean policy; "tinggal", "masih berapa", "sisa" mean balance).
- Adding more prompt rules was not enough for follow-ups with a 4B model (it guessed an employee ID). What worked was a short extra model call that rewrites the follow-up as a standalone question, used only for short follow-ups; if it fails, the previous question is attached instead.
- The code guards (`Anda`, names next to IDs) are narrow on purpose: they only touch nouns the assistant cannot own (sisa cuti, bawahan, tim, atasan) and IDs the tools actually returned.
- Not changed: answers to English questions are still in Indonesian, and the assistant cannot answer "who is my manager" because no tool exposes it (it now says so instead of guessing).
