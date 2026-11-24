import { randomUUID } from "node:crypto";
import { saveChunks, search, close } from "./rag.js";

const docs = [
  {
    title: "Postgres notes",
    chunks: [
      "A B-tree index makes lookups fast. Use CREATE INDEX on columns used in WHERE clauses.",
      "MVCC means readers never block writers. Each transaction sees a snapshot of the data.",
      "If the database is down, add connection retry with backoff instead of crashing the app.",
    ],
  },
  {
    title: "Biology notes",
    chunks: [
      "The mitochondria produce ATP through cellular respiration.",
      "Ribosomes build proteins by joining amino acids together.",
    ],
  },
];

// Use different words from the chunks, to test that search works on meaning.
const queries = [
  "how do I make my queries faster on big tables?",
  "what gives a cell its energy?",
  "my app keeps failing when postgres is unavailable",
];

try {
  for (const doc of docs) {
    await saveChunks(randomUUID(), doc.chunks, { title: doc.title });
    console.log(`Saved ${doc.chunks.length} chunks for "${doc.title}"`);
  }

  for (const q of queries) {
    const rows = await search(q, 3);
    console.log(`\nQ: ${q}`);
    for (const r of rows) {
      console.log(`  ${Number(r.similarity).toFixed(3)}  [${r.metadata.title}] ${r.content}`);
    }
  }
} finally {
  await close();
}