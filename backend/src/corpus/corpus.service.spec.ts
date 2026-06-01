import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CorpusService } from './corpus.service';

describe('CorpusService', () => {
  let service: CorpusService;
  const prisma = {
    source: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    corpusChunk: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CorpusService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CorpusService);
  });

  it('creates approved source metadata', async () => {
    prisma.source.create.mockResolvedValue({ id: 'source-1' });

    await service.createSource({
      type: 'QURAN',
      title: ' Terjemah Kemenag ',
      license: ' approved ',
    });

    expect(prisma.source.create).toHaveBeenCalledWith({
      data: {
        type: 'QURAN',
        title: 'Terjemah Kemenag',
        reference: undefined,
        license: 'approved',
        language: 'id',
      },
    });
  });

  it('creates corpus chunks for existing sources', async () => {
    prisma.source.findUnique.mockResolvedValue({ id: 'source-1' });
    prisma.corpusChunk.create.mockResolvedValue({ id: 'chunk-1' });

    await service.createChunk({
      sourceId: 'source-1',
      content: ' Konten sumber ',
      topic: 'thaharah',
    });

    expect(prisma.corpusChunk.create).toHaveBeenCalledWith({
      data: {
        sourceId: 'source-1',
        content: 'Konten sumber',
        topic: 'thaharah',
        metadata: undefined,
      },
    });
  });

  it('rejects chunks for missing sources', async () => {
    prisma.source.findUnique.mockResolvedValue(null);

    await expect(
      service.createChunk({ sourceId: 'missing', content: 'Konten sumber' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
