/* eslint-disable */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnswerBankService } from '../answers/answer-bank.service';
import { SourcedAnswerService } from '../answers/sourced-answer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    question: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const answerBank = {
    findVerifiedMatch: jest.fn(),
  };
  const sourcedAnswer = {
    createTierOneAnswer: jest.fn(),
  };
  const safety = {
    classifyQuestion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ preferredUstadzIds: [] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnswerBankService, useValue: answerBank },
        { provide: SourcedAnswerService, useValue: sourcedAnswer },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();

    service = module.get(QuestionsService);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it('stores safe questions and sends them to the answer pipeline', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    answerBank.findVerifiedMatch.mockResolvedValue(null);
    prisma.question.create.mockResolvedValue({
      id: 'question-1',
      text: 'Bagaimana cara salat?',
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
    });
    sourcedAnswer.createTierOneAnswer.mockResolvedValue({
      id: 'answer-1',
      status: 'AI_PENDING',
      label: "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz",
      verified: false,
    });

    const result = await service.create(' user-1 ', {
      text: ' Bagaimana cara salat? ',
    });

    expect(prisma.question.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        text: 'Bagaimana cara salat?',
        language: 'id',
        topic: undefined,
        isSensitive: false,
        preferredUstadzId: undefined,
        sessionId: null,
        status: 'RECEIVED',
      },
    });
    expect(answerBank.findVerifiedMatch).toHaveBeenCalledWith(
      'Bagaimana cara salat?',
      [],
    );
    expect(sourcedAnswer.createTierOneAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-1' }),
      prisma,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(result.route).toBe('answer_pipeline');
    expect(result.answer).toEqual(
      expect.objectContaining({ id: 'answer-1', verified: false }),
    );
  });

  it('routes sensitive questions to ustadz review without answer bank lookup', async () => {
    safety.classifyQuestion.mockResolvedValue({
      isSensitive: true,
      topic: 'waris',
    });
    prisma.question.create.mockResolvedValue({
      id: 'question-2',
      isSensitive: true,
      status: 'ANSWERED_VERIFIED',
    });
    prisma.answer = {
      ...prisma.answer,
      create: jest.fn().mockResolvedValue({
        id: 'answer-2',
        body: 'blocked',
        status: 'VERIFIED',
        citations: [],
        verifyingUstadz: null,
      }),
    };

    const result = await service.create('user-1', {
      text: 'Bagaimana pembagian waris?',
    });

    expect(answerBank.findVerifiedMatch).not.toHaveBeenCalled();
    expect(sourcedAnswer.createTierOneAnswer).not.toHaveBeenCalled();
    expect(prisma.question.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        text: 'Bagaimana pembagian waris?',
        language: 'id',
        topic: 'waris',
        isSensitive: true,
        preferredUstadzId: undefined,
        sessionId: null,
        status: 'ANSWERED_VERIFIED',
      },
    });
    expect(prisma.answer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        questionId: 'question-2',
        status: 'VERIFIED',
        isSensitive: true,
        verifiedAt: expect.any(Date),
      }),
      include: expect.any(Object),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'QUESTION_CLASSIFIED',
        entity: 'Question',
        entityId: 'question-2',
        metadata: {
          isSensitive: true,
          topic: 'waris',
        },
      },
    });
    expect(result.route).toBe('ustadz_review');
    expect(result.answer).toEqual(
      expect.objectContaining({
        id: 'answer-2',
        status: 'VERIFIED',
        label: 'Pertanyaan sensitif · tidak dapat dijawab',
        verified: true,
      }),
    );
  });

  it('stores sensitive question and audit log in one transaction', async () => {
    safety.classifyQuestion.mockResolvedValue({
      isSensitive: true,
      topic: 'takfir',
    });
    prisma.question.create.mockResolvedValue({ id: 'question-3' });
    prisma.answer = {
      ...prisma.answer,
      create: jest.fn().mockResolvedValue({
        id: 'answer-3',
        status: 'VERIFIED',
        citations: [],
        verifyingUstadz: null,
      }),
    };

    await service.create('user-1', {
      text: 'Apakah boleh takfir?',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'QUESTION_CLASSIFIED',
        entityId: 'question-3',
      }),
    });
  });

  it('rejects empty question text', async () => {
    await expect(
      service.create('user-1', { text: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing current user id', async () => {
    await expect(
      service.create('', { text: 'Bagaimana cara wudhu?' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses verified answer from bank and skips sourced answer pipeline', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    answerBank.findVerifiedMatch.mockResolvedValue({
      answerId: 'answer-verified-1',
      score: 0.8,
      body: 'Salat wajib lima waktu.',
      language: 'id',
      citations: [
        {
          sourceId: 'source-1',
          label: 'QS 2:43',
          excerpt: null,
          source: { id: 'source-1', title: 'Al-Baqarah', reference: 'QS 2:43' },
        },
      ],
      verifyingUstadz: {
        id: 'ustadz-1',
        publicName: 'Ust. Ahmad',
        bio: null,
        specialties: [],
        madhhab: null,
      },
    });
    prisma.question.create.mockResolvedValue({
      id: 'question-5',
      text: 'Salat itu apa?',
      language: 'id',
      isSensitive: false,
      status: 'ANSWERED_VERIFIED',
    });
    prisma.answer = {
      ...prisma.answer,
      create: jest.fn().mockResolvedValue({
        id: 'answer-new-1',
        status: 'VERIFIED',
        body: 'Salat wajib lima waktu.',
      }),
    };

    const result = await service.create('user-1', { text: 'Salat itu apa?' });

    expect(sourcedAnswer.createTierOneAnswer).not.toHaveBeenCalled();
    expect(result.route).toBe('verified_answer_bank');
    expect(result.answer).toEqual(
      expect.objectContaining({
        verified: true,
        reusedFromAnswerId: 'answer-verified-1',
      }),
    );
    expect(prisma.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ANSWERED_VERIFIED' }),
      }),
    );
  });
});
