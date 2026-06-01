/**
 * One-shot script: back-fill embeddings for all CorpusChunk rows that have no embedding yet.
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/embed-corpus.ts
 */
import { PrismaClient } from '@prisma/client';

const baseUrl =
  process.env.REQUESTY_BASE_URL ?? 'https://router.requesty.ai/v1';
const apiKey = process.env.REQUESTY_API_KEY ?? '';
const embeddingModel =
  process.env.REQUESTY_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: embeddingModel, input: text }),
  });

  if (!res.ok) {
    throw new Error(`Requesty embed failed ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const chunks = await prisma.$queryRaw<{ id: string; content: string }[]>`
      SELECT id, content FROM "CorpusChunk" WHERE embedding IS NULL
    `;

    console.log(`Found ${chunks.length} chunks without embeddings`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(`[${i + 1}/${chunks.length}] ${chunk.id}... `);

      const embedding = await embed(chunk.content);
      const vectorLiteral = `[${embedding.join(',')}]`;

      await prisma.$executeRaw`
        UPDATE "CorpusChunk"
        SET embedding = ${vectorLiteral}::vector
        WHERE id = ${chunk.id}
      `;

      console.log('done');
    }

    console.log('Backfill complete.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
