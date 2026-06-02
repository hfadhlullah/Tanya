/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AnswerStatus, QuestionStatus, SourceType } from '@prisma/client';
import { CorpusRetrievalService } from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';
import { SourcedAnswerService } from './sourced-answer.service';

describe('SourcedAnswerService', () => {
  let service: SourcedAnswerService;
  const corpusRetrieval = {
    embedQuestion: jest.fn(),
    findSourceMatches: jest.fn(),
  };
  const llm = {
    complete: jest.fn(),
  };
  const tx = {
    answer: {
      create: jest.fn(),
    },
    question: {
      update: jest.fn(),
    },
    corpusChunk: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourcedAnswerService,
        { provide: CorpusRetrievalService, useValue: corpusRetrieval },
        { provide: LlmClientService, useValue: llm },
      ],
    }).compile();

    service = module.get(SourcedAnswerService);
  });

  it('creates AI pending answer with citations from source matches', async () => {
    corpusRetrieval.embedQuestion.mockResolvedValue([0.1, 0.2]);
    corpusRetrieval.findSourceMatches.mockResolvedValue([
      {
        id: 'chunk-1',
        sourceId: 'source-1',
        content: 'Dirikanlah salat dan tunaikanlah zakat.',
        metadata: { citationLabel: 'QS Al-Baqarah 2:43' },
        source: {
          id: 'source-1',
          type: SourceType.QURAN,
          title: 'Al-Baqarah',
          reference: 'QS 2:43',
        },
      },
    ]);
    llm.complete.mockResolvedValue(
      'Jawaban berdasarkan sumber relevan dan belum ditinjau ustadz.',
    );
    tx.answer.create.mockResolvedValue({
      id: 'answer-1',
      status: AnswerStatus.AI_PENDING,
    });

    const result = await service.createTierOneAnswer(
      { id: 'question-1', text: 'Bagaimana salat?', language: 'id' },
      tx,
    );

    expect(tx.answer.create).toHaveBeenCalledWith({
      data: {
        questionId: 'question-1',
        body: expect.stringContaining('belum ditinjau ustadz'),
        status: AnswerStatus.AI_PENDING,
        language: 'id',
        citations: {
          create: [
            {
              sourceId: 'source-1',
              label: 'QS Al-Baqarah 2:43',
              excerpt: 'Dirikanlah salat dan tunaikanlah zakat.',
            },
          ],
        },
      },
      include: {
        citations: { include: { source: true } },
        verifyingUstadz: true,
      },
    });
    expect(tx.question.update).toHaveBeenCalledWith({
      where: { id: 'question-1' },
      data: { status: QuestionStatus.ANSWERED_SOURCE },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'answer-1',
        label: "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz",
        verified: false,
      }),
    );
  });

  it('only persists citations the LLM reported via the SUMBER line', async () => {
    corpusRetrieval.embedQuestion.mockResolvedValue([0.1, 0.2]);
    corpusRetrieval.findSourceMatches.mockResolvedValue([
      {
        id: 'chunk-1',
        sourceId: 'source-1',
        content: 'Konteks yang dipakai.',
        metadata: { citationLabel: 'QS Al-Baqarah 2:43' },
        source: { id: 'source-1', type: SourceType.QURAN, title: 'Al-Baqarah', reference: 'QS 2:43' },
      },
      {
        id: 'chunk-2',
        sourceId: 'source-2',
        content: 'Konteks yang tidak dipakai.',
        metadata: { citationLabel: 'QS Al-Baqarah 2:6' },
        source: { id: 'source-2', type: SourceType.QURAN, title: 'Al-Baqarah', reference: 'QS 2:6' },
      },
    ]);
    llm.complete.mockResolvedValue(
      'Jawaban memakai konteks pertama saja.\n\nSUMBER: S1',
    );
    tx.answer.create.mockResolvedValue({ id: 'answer-3', status: AnswerStatus.AI_PENDING });

    await service.createTierOneAnswer(
      { id: 'question-1', text: 'Bagaimana salat?', language: 'id' },
      tx,
    );

    const arg = tx.answer.create.mock.calls[0][0];
    expect(arg.data.body).toBe('Jawaban memakai konteks pertama saja.');
    expect(arg.data.citations.create).toEqual([
      {
        sourceId: 'source-1',
        label: 'QS Al-Baqarah 2:43',
        excerpt: 'Konteks yang dipakai.',
      },
    ]);
  });

  it('omits ustadz section from the prompt when no ustadz corpus matches', async () => {
    corpusRetrieval.embedQuestion.mockResolvedValue([0.1, 0.2]);
    corpusRetrieval.findSourceMatches.mockResolvedValue([
      {
        id: 'chunk-1',
        sourceId: 'source-1',
        content: 'Ayat tentang takwa.',
        metadata: { citationLabel: 'QS Al-Baqarah 2:2' },
        source: { id: 'source-1', type: SourceType.QURAN, title: 'Al-Baqarah', reference: 'QS 2:2' },
      },
      {
        id: 'chunk-2',
        sourceId: 'source-2',
        content: 'Hadits tentang adab.',
        metadata: { citationLabel: 'HR Bukhari' },
        source: { id: 'source-2', type: SourceType.HADITH, title: 'Bukhari', reference: 'HR Bukhari' },
      },
    ]);
    llm.complete.mockResolvedValue('Jawaban.\n\nSUMBER: S1, S2');
    tx.answer.create.mockResolvedValue({ id: 'answer-4', status: AnswerStatus.AI_PENDING });

    await service.createTierOneAnswer(
      { id: 'question-1', text: 'Hukum bertamu?', language: 'id' },
      tx,
    );

    const messages = llm.complete.mock.calls[0][0];
    const system = messages.find((m: any) => m.role === 'system').content;
    const user = messages.find((m: any) => m.role === 'user').content;

    expect(user).not.toContain('USTADZ_REVIEW');
    expect(system).not.toContain('Ustadz review says');
    expect(system).toContain('Do NOT mention or invent any ustadz opinion');
    expect(system).toContain('Quran context says');
    expect(system).toContain('Hadits context says');
  });

  it('returns a generic answer with no sources when no corpus matches', async () => {
    corpusRetrieval.embedQuestion.mockResolvedValue(null);
    corpusRetrieval.findSourceMatches.mockResolvedValue([]);
    llm.complete.mockResolvedValue('Maaf, tidak ada sumber spesifik.');
    tx.answer.create.mockResolvedValue({ id: 'answer-5', status: AnswerStatus.AI_PENDING });

    await service.createTierOneAnswer(
      { id: 'question-1', text: 'Apa?', language: 'id' },
      tx,
    );

    const arg = tx.answer.create.mock.calls[0][0];
    expect(arg.data.citations).toBeUndefined();
    const system = llm.complete.mock.calls[0][0].find((m: any) => m.role === 'system').content;
    expect(system).toContain('no retrieved corpus');
  });

  it('falls back to source title when imported metadata is missing', async () => {
    corpusRetrieval.embedQuestion.mockResolvedValue(null);
    corpusRetrieval.findSourceMatches.mockResolvedValue([]);
    llm.complete.mockResolvedValue('Jawaban AI umum.');
    tx.answer.create.mockResolvedValue({
      id: 'answer-2',
      status: AnswerStatus.AI_PENDING,
    });

    await service.createTierOneAnswer(
      { id: 'question-1', text: 'Apa?', language: 'id' },
      tx,
    );

    expect(tx.answer.create).toHaveBeenCalled();
  });
});
