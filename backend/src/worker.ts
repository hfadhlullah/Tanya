import { PrismaClient } from '@prisma/client';
import { JobsService } from './jobs/jobs.service';
import { WorkerService } from './worker/worker.service';

const baseUrl = process.env.REQUESTY_BASE_URL ?? 'https://router.requesty.ai/v1';
const apiKey = process.env.REQUESTY_API_KEY ?? '';
const embeddingModel = process.env.REQUESTY_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';

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
    const body = await res.text();
    throw new Error(`Requesty embed failed ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

async function bootstrap() {
  const prisma = new PrismaClient();
  const worker = new WorkerService(new JobsService(prisma), prisma, embed);

  console.log('Tanya worker started');

  const shutdown = async () => {
    worker.stop();
    await prisma.$disconnect();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await worker.run();
}

void bootstrap();
