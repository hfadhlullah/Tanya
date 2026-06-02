import { PrismaClient } from '@prisma/client';
import { JobsService } from './jobs/jobs.service';
import { WorkerService } from './worker/worker.service';

const baseUrl =
  process.env.REQUESTY_BASE_URL ?? 'https://router.requesty.ai/v1';
const apiKey = process.env.REQUESTY_API_KEY ?? '';
const embeddingModel =
  process.env.REQUESTY_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
const chatModel =
  process.env.REQUESTY_CHAT_MODEL ?? 'openai/gpt-4o-mini';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: embeddingModel, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Requesty embed failed ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

async function complete(
  messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: chatModel, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Requesty complete failed ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0].message.content;
}

async function bootstrap() {
  const prisma = new PrismaClient();
  const worker = new WorkerService(new JobsService(prisma), prisma, embed, complete);

  console.log('Tanya worker started');

  const shutdown = async () => {
    worker.stop();
    await prisma.$disconnect();
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });

  await worker.run();
}

void bootstrap();
