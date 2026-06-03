/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CorpusRetrievalService } from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';

describe('CorpusRetrievalService', () => {
  let service: CorpusRetrievalService;
  const prisma = {
    $queryRaw: jest.fn(),
    corpusChunk: {
      findMany: jest.fn(),
    },
  };
  const llm = {
    embed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorpusRetrievalService,
        { provide: PrismaService, useValue: prisma },
        { provide: LlmClientService, useValue: llm },
      ],
    }).compile();

    service = module.get(CorpusRetrievalService);
  });

  it('searches source chunks per type by extracted terms', async () => {
    prisma.corpusChunk.findMany.mockResolvedValue([]);

    await service.findSourceMatches('Bagaimana cara salat?');

    // Called 4 times: QURAN, HADITH, VERIFIED_ANSWER, USTADZ_CONTENT
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledTimes(4);
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: { type: 'QURAN' } }),
      }),
    );
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: { type: 'HADITH' } }),
      }),
    );
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: { type: 'VERIFIED_ANSWER' } }),
      }),
    );
  });

  it('falls back to keyword search when vector search returns no matches', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.corpusChunk.findMany.mockResolvedValue([]);

    await service.findSourceMatches(
      'Apa dalil tentang keutamaan sedekah?',
      [0.1, 0.2],
    );

    expect(prisma.$queryRaw).toHaveBeenCalled();
    // Falls back to keyword search — corpusChunk.findMany called per type
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: { type: 'QURAN' },
          OR: expect.arrayContaining([
            { content: { contains: 'tentang', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('prioritises preferred ustadz corpus chunks when preferredUstadzId provided', async () => {
    prisma.corpusChunk.findMany.mockResolvedValue([]);

    await service.findSourceMatches(
      'Bagaimana salat berjamaah?',
      null,
      prisma as any,
      'ustadz-profile-id-123',
    );

    // Should call with preferred ustadz reference filter
    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: { type: 'USTADZ_CONTENT', reference: 'ustadz-profile-id-123' },
        }),
      }),
    );
  });
});
