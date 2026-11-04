import type { ChatMessage, ToolSpec } from "../agent/llm.js";

type Llm = (messages: ChatMessage[], tools: ToolSpec[]) => Promise<ChatMessage>;

// Asks "do these passages answer the question?". Used only for scores in the grey zone just under
// the relevance gate, where raw similarity cannot tell a colloquial question that IS covered
// ("kenaikan gaji kapan?") from one that is not ("berapa gaji karyawan baru?"): both score about
// 0.55. Measured on this corpus the 4B model accepted 9 of 9 covered questions and turned down
// 11 of 11 uncovered ones.
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
