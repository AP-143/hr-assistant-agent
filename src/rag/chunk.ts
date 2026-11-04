import { config } from "../config.js";

export interface Chunk {
  id: string;
  heading: string;
  text: string;
}

interface Section {
  heading: string;
  body: string;
}

// Split markdown into sections, each carrying its heading path ("Cuti > Cuti Tahunan").
function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const stack: string[] = [];
  let body: string[] = [];

  const flush = () => {
    const text = body.join("\n").trim();
    if (text && stack.length > 0) {
      sections.push({ heading: stack.join(" > "), body: text });
    }
    body = [];
  };

  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      flush();
      const depth = match[1].length;
      stack.length = depth - 1;
      stack[depth - 1] = match[2].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}

// Split long text on sentence boundaries, carrying `overlap` chars into the next piece.
function splitLong(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) return [text];

  const sentences = text.match(/[^.!?\n]+[.!?]*\s*/g) ?? [text];
  const pieces: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxChars) {
      pieces.push(current.trim());
      current = current.slice(-overlap) + sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

export function chunkMarkdown(markdown: string): Chunk[] {
  const { maxChars, overlapChars } = config.chunk;
  const chunks: Chunk[] = [];

  for (const section of splitSections(markdown)) {
    const pieces = splitLong(section.body, maxChars, overlapChars);
    pieces.forEach((piece, i) => {
      chunks.push({
        id: `${chunks.length}`,
        heading: section.heading,
        // Prefix the heading path so the embedding keeps the section context.
        text: `${section.heading}\n\n${piece}`,
      });
    });
  }
  return chunks;
}
