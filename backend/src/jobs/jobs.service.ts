import { Inject, Injectable } from '@nestjs/common';
import { JobStatus, JobType, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type JobDelegate = Pick<PrismaClient, 'backgroundJob'>;
type PrismaTx = Pick<PrismaClient, 'backgroundJob' | '$transaction'>;
const leaseMs = 60_000;
const maxAttempts = 3;

@Injectable()
export class JobsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaTx) {}

  enqueueCorpusEmbedding(corpusChunkId: string, tx: JobDelegate = this.prisma) {
    return tx.backgroundJob.create({
      data: {
        type: JobType.CORPUS_EMBEDDING,
        status: JobStatus.PENDING,
        corpusChunkId,
        payload: { corpusChunkId },
      },
    });
  }

  async claimNextJob(tx: PrismaTx = this.prisma) {
    return tx.$transaction(async (transaction) => {
      const now = new Date();
      const job = await transaction.backgroundJob.findFirst({
        where: {
          attempts: { lt: maxAttempts },
          OR: [
            { status: JobStatus.PENDING, runAfter: { lte: now } },
            { status: JobStatus.PROCESSING, leaseExpiresAt: { lt: now } },
          ],
        },
        orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
      });

      if (!job) {
        return null;
      }

      const nextLeaseExpiresAt = new Date(now.getTime() + leaseMs);
      const claimed = await transaction.backgroundJob.updateMany({
        where: {
          id: job.id,
          attempts: { lt: maxAttempts },
          OR: [
            { status: JobStatus.PENDING },
            { status: JobStatus.PROCESSING, leaseExpiresAt: { lt: now } },
          ],
        },
        data: {
          status: JobStatus.PROCESSING,
          attempts: { increment: 1 },
          error: null,
          lockedAt: now,
          leaseExpiresAt: nextLeaseExpiresAt,
        },
      });

      if (claimed.count === 0) {
        return null;
      }

      return transaction.backgroundJob.findUnique({ where: { id: job.id } });
    });
  }

  completeJob(jobId: string, tx: JobDelegate = this.prisma) {
    return tx.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        error: null,
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
    });
  }

  failJob(jobId: string, error: string, tx: JobDelegate = this.prisma) {
    return tx.backgroundJob.update({
      where: { id: jobId },
      data: { status: JobStatus.FAILED, error, leaseExpiresAt: null },
    });
  }
}
