import OpenAI from "openai";
import pg from "pg";
import { randomUUID } from "node:crypto";
import "dotenv/config";

const client = new OpenAI();
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const EMBEDDING_MODEL = "text-embedding-3-small";

async function embed(texts) {
  const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return res.data.map((d) => d.embedding);
}

export async function saveChunks(documentId, chunks, metadata = {}) {
  const vectors = await embed(chunks); // one API call for many chunks
  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      `INSERT INTO document_chunks (id, document_id, content, embedding, metadata)
      SELECT $1, $2, $3, $4::vector, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM document_chunks WHERE content = $3
      )`,
      [randomUUID(), documentId, chunks[i], JSON.stringify(vectors[i]), metadata]
    );
  }
}

export async function search(query, limit = 5) {
  const [queryVector] = await embed([query]);
  const { rows } = await pool.query(
    `SELECT id, content, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [JSON.stringify(queryVector), limit]
  );
  return rows;
}

export async function close() {
  await pool.end();
}