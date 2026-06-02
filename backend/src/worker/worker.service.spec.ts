/* eslint-disable */
import { JobType } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';
import { WorkerService } from './worker.service';

describe('WorkerService', () => {
  const jobs = {
    claimNextJob: jest.fn(),
    completeJob: jest.fn(),
    failJob: jest.fn(),
  } as unknown as jest.Mocked<JobsService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPrisma = {
    corpusChunk: { findUnique: jest.fn() },
    $executeRaw: jest.fn(),
  } as unknown as import('@prisma/client').PrismaClient;

  const mockEmbed = jest.fn().mockResolvedValue(new Array(1536).fill(0));

  it('processes corpus embedding jobs', async () => {
    jobs.claimNextJob.mockResolvedValue({
      id: 'job-1',
      type: JobType.CORPUS_EMBEDDING,
      payload: { corpusChunkId: 'chunk-1' },
    } as unknown as Awaited<ReturnType<JobsService['claimNextJob']>>);

    (mockPrisma.corpusChunk.findUnique as jest.Mock).mockResolvedValue({
      id: 'chunk-1',
      content: 'test content',
    });

    const worker = new WorkerService(jobs, mockPrisma, mockEmbed);

    await expect(worker.processNextJob()).resolves.toBe(true);
    expect(jobs.completeJob).toHaveBeenCalledWith('job-1');
    expect(jobs.failJob).not.toHaveBeenCalled();
  });

  it('returns false when no job is available', async () => {
    jobs.claimNextJob.mockResolvedValue(null);

    const worker = new WorkerService(jobs, mockPrisma, mockEmbed);

    await expect(worker.processNextJob()).resolves.toBe(false);
  });

  it('fails unsupported job types instead of completing them', async () => {
    jobs.claimNextJob.mockResolvedValue({
      id: 'job-2',
      type: JobType.ANALYTICS_AGGREGATION,
    } as Awaited<ReturnType<JobsService['claimNextJob']>>);

    const worker = new WorkerService(jobs, mockPrisma, mockEmbed);

    await expect(worker.processNextJob()).resolves.toBe(true);
    expect(jobs.completeJob).not.toHaveBeenCalled();
    expect(jobs.failJob).toHaveBeenCalledWith(
      'job-2',
      'Unsupported job type: ANALYTICS_AGGREGATION',
    );
  });
});
