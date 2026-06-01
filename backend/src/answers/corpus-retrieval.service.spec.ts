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

  it('searches source chunks by extracted terms', async () => {
    await service.findSourceMatches('Bagaimana cara salat?');

    expect(prisma.corpusChunk.findMany).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          { content: { contains: 'bagaimana', mode: 'insensitive' } },
          { topic: { contains: 'salat', mode: 'insensitive' } },
        ]),
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { source: true },
    });
  });
});
