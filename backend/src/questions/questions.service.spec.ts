/* eslint-disable */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LlmClientService } from '../answers/llm-client.service';
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
  const sourcedAnswer = {
    createTierOneAnswer: jest.fn(),
    createConversationalAnswer: jest.fn(),
  };
  const llm = {
    complete: jest.fn(),
  };
  const safety = {
    classifyQuestion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ preferredUstadzIds: [] });
    llm.complete.mockResolvedValue('RAG');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LlmClientService, useValue: llm },
        { provide: SourcedAnswerService, useValue: sourcedAnswer },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();

    service = module.get(QuestionsService);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });

  it('stores safe questions and sends them to the answer pipeline', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
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
    expect(sourcedAnswer.createTierOneAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-1' }),
      prisma,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(result.route).toBe('answer_pipeline');
    expect(result.answer).toEqual(
      expect.objectContaining({ id: 'answer-1', verified: false }),
    );
    expect(sourcedAnswer.createConversationalAnswer).not.toHaveBeenCalled();
  });

  it('routes simple conversational messages away from the RAG pipeline', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    prisma.question.create.mockResolvedValue({
      id: 'question-chat-1',
      text: 'halo',
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
    });
    llm.complete.mockResolvedValue('CHAT');
    sourcedAnswer.createConversationalAnswer.mockResolvedValue({
      id: 'answer-chat-1',
      status: 'AI_PENDING',
      label: null,
      verified: false,
    });

    const result = await service.create('user-1', {
      text: 'halo',
      intentHint: 'conversation',
    });

    expect(sourcedAnswer.createConversationalAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-chat-1' }),
      prisma,
    );
    expect(sourcedAnswer.createTierOneAnswer).not.toHaveBeenCalled();
    expect(result.route).toBe('conversation');
    expect(result.answer).toEqual(
      expect.objectContaining({ id: 'answer-chat-1', verified: false }),
    );
  });

  it('treats assalamualaikum as conversational without RAG', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    prisma.question.create.mockResolvedValue({
      id: 'question-chat-2',
      text: 'assalamualaikum',
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
    });
    sourcedAnswer.createConversationalAnswer.mockResolvedValue({
      id: 'answer-chat-2',
      status: 'AI_PENDING',
      label: null,
      verified: false,
    });

    const result = await service.create('user-1', {
      text: 'assalamualaikum',
      intentHint: 'conversation',
    });

    expect(sourcedAnswer.createConversationalAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-chat-2' }),
      prisma,
    );
    expect(sourcedAnswer.createTierOneAnswer).not.toHaveBeenCalled();
    expect(result.route).toBe('conversation');
  });

  it('trusts the explicit conversation intent hint and skips LLM intent routing', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    prisma.question.create.mockResolvedValue({
      id: 'question-chat-3',
      text: 'halo',
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
    });
    sourcedAnswer.createConversationalAnswer.mockResolvedValue({
      id: 'answer-chat-3',
      status: 'AI_PENDING',
      label: null,
      verified: false,
    });

    const result = await service.create('user-1', {
      text: 'halo',
      intentHint: 'conversation',
    });

    expect(llm.complete).not.toHaveBeenCalled();
    expect(sourcedAnswer.createConversationalAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-chat-3' }),
      prisma,
    );
    expect(result.route).toBe('conversation');
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

  it('sends normal non-conversational safe questions to the sourced answer pipeline', async () => {
    safety.classifyQuestion.mockResolvedValue({ isSensitive: false });
    prisma.question.create.mockResolvedValue({
      id: 'question-5',
      text: 'Salat itu apa?',
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
    });
    sourcedAnswer.createTierOneAnswer.mockResolvedValue({
      id: 'answer-5',
      status: 'AI_PENDING',
      verified: false,
    });

    const result = await service.create('user-1', { text: 'Salat itu apa?' });

    expect(sourcedAnswer.createTierOneAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'question-5' }),
      prisma,
    );
    expect(sourcedAnswer.createConversationalAnswer).not.toHaveBeenCalled();
    expect(result.route).toBe('answer_pipeline');
    expect(result.answer).toEqual(
      expect.objectContaining({ id: 'answer-5', verified: false }),
    );
  });
});
