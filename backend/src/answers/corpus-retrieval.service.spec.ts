import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CorpusRetrievalService } from './corpus-retrieval.service';

describe('CorpusRetrievalService', () => {
  let service: CorpusRetrievalService;
  const prisma = {
    corpusChunk: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CorpusRetrievalService, { provide: PrismaService, useValue: prisma }],
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
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { source: true },
    });
  });
});
