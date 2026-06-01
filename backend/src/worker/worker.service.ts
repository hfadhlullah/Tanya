import { JobType, PrismaClient } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';

const idleDelayMs = 1000;

export class WorkerService {
  private shouldStop = false;

  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaClient,
    private readonly embedFn: (text: string) => Promise<number[]>,
  ) {}

  stop() {
    this.shouldStop = true;
  }

  async run() {
    while (!this.shouldStop) {
      const didProcess = await this.processNextJob();

      if (!didProcess) {
        await this.sleep(idleDelayMs);
      }
    }
  }

  async processNextJob() {
    const job = await this.jobsService.claimNextJob();

    if (!job) {
      return false;
    }

    try {
      switch (job.type) {
        case JobType.CORPUS_EMBEDDING:
          await this.handleCorpusEmbedding(job);
          await this.jobsService.completeJob(job.id);
          return true;
        default:
          throw new Error(`Unsupported job type: ${job.type}`);
      }
    } catch (error) {
      await this.jobsService.failJob(
        job.id,
        error instanceof Error ? error.message : 'Unknown worker error',
      );
      return true;
    }
  }

  private async handleCorpusEmbedding(job: { payload: unknown }) {
    const payload = job.payload as { corpusChunkId?: string };
    const chunkId = payload?.corpusChunkId;

    if (!chunkId) {
      throw new Error('Missing corpusChunkId in job payload');
    }

    const chunk = await this.prisma.corpusChunk.findUnique({
      where: { id: chunkId },
      select: { id: true, content: true },
    });

    if (!chunk) {
      throw new Error(`CorpusChunk ${chunkId} not found`);
    }

    const embedding = await this.embedFn(chunk.content);
    const vectorLiteral = `[${embedding.join(',')}]`;

    await this.prisma.$executeRaw`
      UPDATE "CorpusChunk"
      SET embedding = ${vectorLiteral}::vector
      WHERE id = ${chunk.id}
    `;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
