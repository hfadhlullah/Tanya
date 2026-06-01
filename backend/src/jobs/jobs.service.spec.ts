/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, JobType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  const prisma = {
    backgroundJob: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(JobsService);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it('enqueues corpus embedding jobs', async () => {
    await service.enqueueCorpusEmbedding('chunk-1');

    expect(prisma.backgroundJob.create).toHaveBeenCalledWith({
      data: {
        type: JobType.CORPUS_EMBEDDING,
        status: JobStatus.PENDING,
        corpusChunkId: 'chunk-1',
        payload: { corpusChunkId: 'chunk-1' },
      },
    });
  });

  it('claims the oldest pending runnable job', async () => {
    prisma.backgroundJob.findFirst.mockResolvedValue({ id: 'job-1' });
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.backgroundJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: JobStatus.PROCESSING,
    });

    await expect(service.claimNextJob()).resolves.toEqual({
      id: 'job-1',
      status: JobStatus.PROCESSING,
    });

    expect(prisma.backgroundJob.findFirst).toHaveBeenCalledWith({
      where: {
        attempts: { lt: 3 },
        OR: [
          { status: JobStatus.PENDING, runAfter: { lte: expect.any(Date) } },
          {
            status: JobStatus.PROCESSING,
            leaseExpiresAt: { lt: expect.any(Date) },
          },
        ],
      },
      orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
    });
    expect(prisma.backgroundJob.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
        attempts: { lt: 3 },
        OR: [
          { status: JobStatus.PENDING },
          {
            status: JobStatus.PROCESSING,
            leaseExpiresAt: { lt: expect.any(Date) },
          },
        ],
      },
      data: {
        status: JobStatus.PROCESSING,
        attempts: { increment: 1 },
        error: null,
        lockedAt: expect.any(Date),
        leaseExpiresAt: expect.any(Date),
      },
    });
  });

  it('can reclaim stale processing jobs', async () => {
    prisma.backgroundJob.findFirst.mockResolvedValue({
      id: 'job-2',
      status: JobStatus.PROCESSING,
      leaseExpiresAt: new Date(Date.now() - 1000),
    });
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.backgroundJob.findUnique.mockResolvedValue({
      id: 'job-2',
      status: JobStatus.PROCESSING,
    });

    await expect(service.claimNextJob()).resolves.toEqual({
      id: 'job-2',
      status: JobStatus.PROCESSING,
    });
  });

  it('returns null when another worker already claimed the job', async () => {
    prisma.backgroundJob.findFirst.mockResolvedValue({ id: 'job-1' });
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.claimNextJob()).resolves.toBeNull();
    expect(prisma.backgroundJob.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when no job is available', async () => {
    prisma.backgroundJob.findFirst.mockResolvedValue(null);

    await expect(service.claimNextJob()).resolves.toBeNull();
  });
});
