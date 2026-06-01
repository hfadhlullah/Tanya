import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UstadzStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UstadzService } from './ustadz.service';

describe('UstadzService', () => {
  let service: UstadzService;
  const prisma = {
    user: { update: jest.fn() },
    ustadzProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    answer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    question: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    sensitiveRule: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UstadzService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { store: jest.fn(), delete: jest.fn(), getUrl: jest.fn() } },
      ],
    }).compile();

    service = module.get(UstadzService);
  });

  it('creates pending ustadz profile and locks dashboard', async () => {
    prisma.ustadzProfile.upsert.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    const result = await service.onboard('user-1', {
      publicName: ' Ust. Ahmad ',
      specialties: ['thaharah'],
      gatedTopics: ['waris'],
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'USTADZ' },
    });
    expect(prisma.ustadzProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ publicName: 'Ust. Ahmad', status: 'PENDING' }),
        update: expect.objectContaining({ publicName: 'Ust. Ahmad', status: 'PENDING' }),
      }),
    );
    expect(prisma.sensitiveRule.createMany).toHaveBeenCalled();
    expect(result.locked).toBe(true);
  });

  it('blocks dashboard while profile is pending', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    await expect(service.getDashboard('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows dashboard when profile is approved', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.APPROVED });

    await expect(service.getDashboard('user-1')).resolves.toEqual({
      profile: { id: 'ustadz-1', status: UstadzStatus.APPROVED },
      locked: false,
    });
  });

  it('approves and rejects profiles', async () => {
    await service.approve('ustadz-1');
    await service.reject('ustadz-1');

    expect(prisma.ustadzProfile.update).toHaveBeenCalledWith({
      where: { id: 'ustadz-1' },
      data: { status: UstadzStatus.APPROVED },
    });
    expect(prisma.ustadzProfile.update).toHaveBeenCalledWith({
      where: { id: 'ustadz-1' },
      data: { status: UstadzStatus.REJECTED },
    });
  });

  it('returns review queue only for approved ustadz', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.APPROVED });
    prisma.answer.findMany.mockResolvedValue([{ id: 'answer-1' }]);

    await expect(service.getReviewQueue('user-1')).resolves.toEqual({
      profileId: 'ustadz-1',
      answers: [{ id: 'answer-1' }],
    });
    expect(prisma.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'AI_PENDING', verifyingUstadzId: null }),
      }),
    );
  });

  it('blocks review queue for pending ustadz', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    await expect(service.getReviewQueue('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('verifies answer with approved ustadz attribution', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.APPROVED });
    prisma.answer.findUnique.mockResolvedValue({
      id: 'answer-1',
      body: 'Draft',
      status: 'AI_PENDING',
      questionId: 'question-1',
    });
    prisma.answer.update.mockResolvedValue({ id: 'answer-1', status: 'VERIFIED' });

    await expect(service.verifyAnswer('user-1', 'answer-1', { body: 'Edited' })).resolves.toEqual(
      { id: 'answer-1', status: 'VERIFIED', verified: true },
    );
    expect(prisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'Edited',
          status: 'VERIFIED',
          verifyingUstadzId: 'ustadz-1',
          verifiedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.question.update).toHaveBeenCalledWith({
      where: { id: 'question-1' },
      data: { status: 'ANSWERED_VERIFIED' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ANSWER_EDITED', entity: 'Answer' }),
      }),
    );
  });

  it('blocks pending ustadz from verifying answers', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    await expect(service.verifyAnswer('user-1', 'answer-1', {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.answer.findUnique).not.toHaveBeenCalled();
  });

  it('writes ANSWER_APPROVED audit log when body unchanged', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.APPROVED });
    prisma.answer.findUnique.mockResolvedValue({
      id: 'answer-1',
      body: 'Original',
      status: 'AI_PENDING',
      questionId: 'question-1',
    });
    prisma.answer.update.mockResolvedValue({ id: 'answer-1', status: 'VERIFIED' });

    await service.verifyAnswer('user-1', 'answer-1', {});

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ANSWER_APPROVED' }),
      }),
    );
  });
});
