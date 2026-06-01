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

  it('processes corpus embedding placeholder jobs', async () => {
    jobs.claimNextJob.mockResolvedValue({
      id: 'job-1',
      type: JobType.CORPUS_EMBEDDING,
    } as Awaited<ReturnType<JobsService['claimNextJob']>>);

    const worker = new WorkerService(jobs);

    await expect(worker.processNextJob()).resolves.toBe(true);
    expect(jobs.completeJob).toHaveBeenCalledWith('job-1');
    expect(jobs.failJob).not.toHaveBeenCalled();
  });

  it('returns false when no job is available', async () => {
    jobs.claimNextJob.mockResolvedValue(null);

    const worker = new WorkerService(jobs);

    await expect(worker.processNextJob()).resolves.toBe(false);
  });

  it('fails unsupported job types instead of completing them', async () => {
    jobs.claimNextJob.mockResolvedValue({
      id: 'job-2',
      type: JobType.ANALYTICS_AGGREGATION,
    } as Awaited<ReturnType<JobsService['claimNextJob']>>);

    const worker = new WorkerService(jobs);

    await expect(worker.processNextJob()).resolves.toBe(true);
    expect(jobs.completeJob).not.toHaveBeenCalled();
    expect(jobs.failJob).toHaveBeenCalledWith('job-2', 'Unsupported job type: ANALYTICS_AGGREGATION');
  });
});
