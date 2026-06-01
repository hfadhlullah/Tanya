import { JobType } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';

const idleDelayMs = 1000;

export class WorkerService {
  private shouldStop = false;

  constructor(private readonly jobsService: JobsService) {}

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
          // Placeholder: real embedding generation and pgvector writes land with RAG integration.
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

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
