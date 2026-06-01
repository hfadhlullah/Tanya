import { PrismaClient } from '@prisma/client';
import { JobsService } from './jobs/jobs.service';
import { WorkerService } from './worker/worker.service';

async function bootstrap() {
  const prisma = new PrismaClient();
  const worker = new WorkerService(new JobsService(prisma));

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
