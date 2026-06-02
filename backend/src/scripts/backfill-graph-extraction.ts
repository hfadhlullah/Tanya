/**
 * Enqueue GRAPH_EXTRACTION jobs for all CorpusChunks that have embeddings
 * but have never had a graph extraction job created.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/backfill-graph-extraction.ts
 */
import { PrismaClient, JobType, JobStatus } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const alreadyQueued = await prisma.backgroundJob.findMany({
    where: { type: JobType.GRAPH_EXTRACTION },
    select: { corpusChunkId: true },
  });
  const queuedIds = new Set(
    alreadyQueued.map((j) => j.corpusChunkId).filter(Boolean) as string[],
  );

  const chunks = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "CorpusChunk" WHERE embedding IS NOT NULL
  `;

  const toEnqueue = chunks.filter((c) => !queuedIds.has(c.id));
  console.log(
    `Found ${chunks.length} embedded chunks, ${toEnqueue.length} need graph extraction`,
  );

  let count = 0;
  for (const chunk of toEnqueue) {
    await prisma.backgroundJob.create({
      data: {
        type: JobType.GRAPH_EXTRACTION,
        status: JobStatus.PENDING,
        corpusChunkId: chunk.id,
        payload: { corpusChunkId: chunk.id },
      },
    });
    count++;
    if (count % 100 === 0) {
      console.log(`Enqueued ${count}/${toEnqueue.length}...`);
    }
  }

  console.log(`Done. Enqueued ${count} GRAPH_EXTRACTION jobs.`);
  await prisma.$disconnect();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
