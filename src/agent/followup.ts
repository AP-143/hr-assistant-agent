import type { ChatMessage, Llm } from "../ollama.js";

export interface Exchange {
  previousQuestion: string;
  previousAnswer?: string;
}

const SMALL_TALK =
  /^\s*(halo|hai|hi|hello|pagi|siang|sore|malam|selamat\s+\w+|terima\s*kasih|makasih|thanks|thank you|ok|oke|sip)(\s+(ya|yaa|banyak|kak|pak|bu))?\W*$/i;

export function isSmallTalk(text: string): boolean {
  return SMALL_TALK.test(text);
}

// A bare "Kalau Andi?" needs the previous question, or a small model invents an answer.
const FOLLOW_UP_CUE = /^\s*(kalau|kalo|dan|lalu|terus|trus|bagaimana dengan|gimana dengan|bagaimana kalau|gimana kalau|how about|and)\b/i;

export function isFollowUp(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return FOLLOW_UP_CUE.test(text) || words <= 3;
}

// The latest question in the conversation and the answer that followed it.
export function lastExchange(history: ChatMessage[]): Exchange | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") {
      const answer = history.slice(i + 1).find((m) => m.role === "assistant");
      return { previousQuestion: history[i].content, previousAnswer: answer?.content };
    }
  }
  return undefined;
}

const INSTRUCTIONS = `You rewrite a follow-up question into ONE complete, standalone question in Indonesian. Use the previous question and answer to fill in what the follow-up leaves out. Keep names, IDs and numbers. Do not answer it. Output only the question.

Examples:
Previous question: "Berapa sisa cuti Sari Dewi?" Follow-up: "Kalau Andi?" -> Berapa sisa cuti Andi?
Previous question: "Boleh WFH berapa hari seminggu?" Follow-up: "Hari apa saja?" -> Hari apa saja yang boleh WFH?
Previous question: "Sisa cuti saya berapa hari?" Follow-up: "Dan yang sudah saya ambil?" -> Berapa hari cuti yang sudah saya ambil?`;

// Rewrite the follow-up into a full question so the reliable normal path handles it. null = unusable.
export async function condenseFollowUp(llm: Llm, followUp: string, previous: Exchange): Promise<string | null> {
  const answer = (previous.previousAnswer ?? "").slice(0, 300);
  try {
    const reply = await llm(
      [
        { role: "system", content: INSTRUCTIONS },
        {
          role: "user",
          content: `Previous question: "${previous.previousQuestion}"\nPrevious answer: "${answer}"\nFollow-up: "${followUp}"`,
        },
      ],
      [],
    );
    return cleanQuestion(reply.content);
  } catch {
    return null;
  }
}

function cleanQuestion(raw: string): string | null {
  const firstLine = raw.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  const question = firstLine
    .replace(/^(pertanyaan|question|standalone question)\s*:\s*/i, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
  if (question.length < 3 || question.length > 250) return null;
  if (/^(mohon maaf|maaf)/i.test(question)) return null;
  return question;
}
