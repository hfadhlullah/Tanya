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
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(JobsService);
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

    await service.claimNextJob();

    expect(prisma.backgroundJob.findFirst).toHaveBeenCalledWith({
      where: {
        status: JobStatus.PENDING,
        runAfter: { lte: expect.any(Date) },
      },
      orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
    });
    expect(prisma.backgroundJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: {
        status: JobStatus.PROCESSING,
        attempts: { increment: 1 },
        error: null,
      },
    });
  });

  it('returns null when no job is available', async () => {
    prisma.backgroundJob.findFirst.mockResolvedValue(null);

    await expect(service.claimNextJob()).resolves.toBeNull();
  });
});
