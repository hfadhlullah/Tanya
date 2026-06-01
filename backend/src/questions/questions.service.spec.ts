import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnswerBankService } from '../answers/answer-bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  const prisma = {
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
  const safety = {
    classifyQuestion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AnswerBankService, useValue: answerBank },
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
      isSensitive: false,
      status: 'RECEIVED',
    });

    const result = await service.create({
      userId: ' user-1 ',
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
        status: 'RECEIVED',
      },
    });
    expect(answerBank.findVerifiedMatch).toHaveBeenCalledWith('Bagaimana cara salat?');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(result.route).toBe('answer_pipeline');
    expect(result.answer).toBeNull();
  });

  it('routes sensitive questions to ustadz review without answer bank lookup', async () => {
    safety.classifyQuestion.mockResolvedValue({
      isSensitive: true,
      topic: 'waris',
    });
    prisma.question.create.mockResolvedValue({
      id: 'question-2',
      isSensitive: true,
      status: 'ROUTED_TO_USTADZ',
    });

    const result = await service.create({
      userId: 'user-1',
      text: 'Bagaimana pembagian waris?',
    });

    expect(answerBank.findVerifiedMatch).not.toHaveBeenCalled();
    expect(prisma.question.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        text: 'Bagaimana pembagian waris?',
        language: 'id',
        topic: 'waris',
        isSensitive: true,
        preferredUstadzId: undefined,
        status: 'ROUTED_TO_USTADZ',
      },
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
    expect(result.answer).toBeNull();
  });

  it('stores sensitive question and audit log in one transaction', async () => {
    safety.classifyQuestion.mockResolvedValue({
      isSensitive: true,
      topic: 'takfir',
    });
    prisma.question.create.mockResolvedValue({ id: 'question-3' });

    await service.create({
      userId: 'user-1',
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
    await expect(service.create({ userId: 'user-1', text: ' ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
