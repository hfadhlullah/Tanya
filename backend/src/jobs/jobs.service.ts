import { Inject, Injectable } from '@nestjs/common';
import { JobStatus, JobType, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaTx = Pick<PrismaClient, 'backgroundJob'>;

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaTx) {}

  enqueueCorpusEmbedding(corpusChunkId: string, tx: PrismaTx = this.prisma) {
    return tx.backgroundJob.create({
      data: {
        type: JobType.CORPUS_EMBEDDING,
        status: JobStatus.PENDING,
        corpusChunkId,
        payload: { corpusChunkId } as Prisma.InputJsonObject,
      },
    });
  }

  async claimNextJob(tx: PrismaTx = this.prisma) {
    const job = await tx.backgroundJob.findFirst({
      where: {
        status: JobStatus.PENDING,
        runAfter: { lte: new Date() },
      },
      orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
    });

    if (!job) {
      return null;
    }

    return tx.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PROCESSING,
        attempts: { increment: 1 },
        error: null,
      },
    });
  }

  completeJob(jobId: string, tx: PrismaTx = this.prisma) {
    return tx.backgroundJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, error: null },
    });
  }

  failJob(jobId: string, error: string, tx: PrismaTx = this.prisma) {
    return tx.backgroundJob.update({
      where: { id: jobId },
      data: { status: JobStatus.FAILED, error },
    });
  }
}
