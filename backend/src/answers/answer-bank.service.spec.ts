import { Test, TestingModule } from '@nestjs/testing';
import { AnswerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerBankService } from './answer-bank.service';

describe('AnswerBankService', () => {
  let service: AnswerBankService;
  const prisma = {
    answer: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnswerBankService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AnswerBankService);
  });

  it('returns null when no verified answers match', async () => {
    prisma.answer.findMany.mockResolvedValue([]);

    await expect(service.findVerifiedMatch('Bagaimana cara wudhu?')).resolves.toBeNull();
    expect(prisma.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: AnswerStatus.VERIFIED }) }),
    );
  });

  it('returns null for question text shorter than minimum term length', async () => {
    await expect(service.findVerifiedMatch('A')).resolves.toBeNull();
    expect(prisma.answer.findMany).not.toHaveBeenCalled();
  });

  it('returns best matching verified answer above score threshold', async () => {
    prisma.answer.findMany.mockResolvedValue([
      {
        id: 'answer-1',
        body: 'Salat wajib lima waktu sehari semalam.',
        language: 'id',
        verifiedAt: new Date(),
        question: { text: 'Bagaimana cara salat yang benar?' },
        citations: [{ sourceId: 'source-1', label: 'QS 2:43', excerpt: null, source: { id: 'source-1', title: 'Al-Baqarah', reference: 'QS 2:43' } }],
        verifyingUstadz: { id: 'ustadz-1', publicName: 'Ust. Ahmad', bio: null, specialties: [], madhhab: null },
      },
    ]);

    const result = await service.findVerifiedMatch('Bagaimana cara salat yang benar?');

    expect(result).not.toBeNull();
    expect(result?.answerId).toBe('answer-1');
    expect(result?.score).toBeGreaterThanOrEqual(0.5);
    expect(result?.body).toBe('Salat wajib lima waktu sehari semalam.');
    expect(result?.citations).toHaveLength(1);
    expect(result?.verifyingUstadz?.publicName).toBe('Ust. Ahmad');
  });

  it('rejects answer below 0.5 score threshold', async () => {
    prisma.answer.findMany.mockResolvedValue([
      {
        id: 'answer-1',
        body: 'Zakat adalah rukun islam.',
        language: 'id',
        verifiedAt: new Date(),
        question: { text: 'Apa itu zakat?' },
        citations: [],
        verifyingUstadz: null,
      },
    ]);

    // question terms don't overlap with answer body/question
    const result = await service.findVerifiedMatch('Bagaimana cara salat lima waktu?');

    expect(result).toBeNull();
  });

  it('queries only VERIFIED status answers', async () => {
    prisma.answer.findMany.mockResolvedValue([]);

    await service.findVerifiedMatch('Bagaimana cara wudhu yang benar?');

    expect(prisma.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: AnswerStatus.VERIFIED }),
      }),
    );
  });
});
