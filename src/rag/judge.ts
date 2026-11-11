import type { Llm } from "../ollama.js";

// Only for the grey zone under the gate (measured: 9/9 covered and 11/11 uncovered judged right).
const INSTRUCTIONS = `You check whether HR policy passages contain the information needed to answer a question.
Answer YES only if the passages state the answer to the question itself. Answer NO if they only mention a related topic or a few of the same words.
Reply with one word: YES or NO.`;

export async function judgeRelevance(llm: Llm, question: string, passages: string[]): Promise<boolean> {
  try {
    const reply = await llm(
      [
        { role: "system", content: INSTRUCTIONS },
        {
          role: "user",
          content: `Question: ${question}\n\nPassages:\n${passages.map((p, i) => `[${i + 1}] ${p}`).join("\n\n")}\n\nDo the passages contain the answer? Reply YES or NO.`,
        },
      ],
      [],
    );
    return /^\s*yes\b/i.test(reply.content);
  } catch {
    // An unsure check must never let an answer through.
    return false;
  }
}
