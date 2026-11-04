import fs from "node:fs/promises";
import { config } from "../config.js";
import { chunkMarkdown } from "./chunk.js";
import { embed } from "./ollama.js";
import { saveChunks } from "./store.js";

async function main() {
  const markdown = await fs.readFile(config.docPath, "utf8");
  const chunks = chunkMarkdown(markdown);
  console.log(`Chunked ${config.docPath} into ${chunks.length} chunks.`);

  const vectors: number[][] = [];
  const batchSize = 8;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    vectors.push(...(await embed(batch.map((c) => c.text))));
    console.log(`Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
  }

  await saveChunks(chunks, vectors);
  console.log(`Stored in LanceDB at ${config.dbPath} (table: ${config.tableName}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
