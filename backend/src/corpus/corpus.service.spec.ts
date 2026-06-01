/* eslint-disable */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CorpusService } from './corpus.service';

describe('CorpusService', () => {
  let service: CorpusService;
  const prisma = {
    source: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    corpusChunk: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const jobs = {
    enqueueCorpusEmbedding: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorpusService,
        { provide: PrismaService, useValue: prisma },
        { provide: JobsService, useValue: jobs },
        {
          provide: StorageService,
          useValue: { store: jest.fn(), delete: jest.fn(), getUrl: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CorpusService);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
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
    expect(jobs.enqueueCorpusEmbedding).toHaveBeenCalledWith('chunk-1', prisma);
  });

  it('rejects chunks for missing sources', async () => {
    prisma.source.findUnique.mockResolvedValue(null);

    await expect(
      service.createChunk({ sourceId: 'missing', content: 'Konten sumber' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('imports quran json and enqueues embedding jobs', async () => {
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({
      id: 'source-1',
      type: 'QURAN',
      title: 'Quran ID',
    });
    prisma.corpusChunk.create
      .mockResolvedValueOnce({ id: 'chunk-1' })
      .mockResolvedValueOnce({ id: 'chunk-2' });

    const result = await service.importCorpus(
      { type: 'QURAN', title: 'Quran ID', license: 'approved', language: 'id' },
      [
        {
          originalname: 'quran.json',
          mimetype: 'application/json',
          buffer: Buffer.from(
            JSON.stringify([
              {
                surah: '1',
                ayah: '1',
                surahName: 'Al-Fatihah',
                text: 'Dengan nama Allah',
              },
              {
                surah: '1',
                ayah: '2',
                surahName: 'Al-Fatihah',
                text: 'Segala puji bagi Allah',
              },
            ]),
          ),
        },
      ],
    );

    expect(prisma.corpusChunk.create).toHaveBeenNthCalledWith(1, {
      data: {
        sourceId: 'source-1',
        content: 'Dengan nama Allah',
        topic: 'Al-Fatihah',
        metadata: {
          sourceType: 'QURAN',
          surah: '1',
          ayah: '1',
          surahName: 'Al-Fatihah',
          citationLabel: 'QS Al-Fatihah 1:1',
          importRow: 1,
        },
      },
    });
    expect(jobs.enqueueCorpusEmbedding).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      source: { id: 'source-1', type: 'QURAN', title: 'Quran ID' },
      importSummary: {
        type: 'QURAN',
        fileName: 'quran.json',
        filesProcessed: ['quran.json'],
        recordsReceived: 2,
        chunksCreated: 2,
        embeddingJobsQueued: 2,
      },
    });
  });

  it('rejects invalid hadith imports', async () => {
    prisma.source.findFirst.mockResolvedValue(null);

    await expect(
      service.importCorpus(
        {
          type: 'HADITH',
          title: 'Bukhari',
          license: 'approved',
          language: 'id',
        },
        [
          {
            originalname: 'hadith.csv',
            mimetype: 'text/csv',
            buffer: Buffer.from('collection,text\nBukhari,Isi hadith'),
          },
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports csv imports with quoted multiline text', async () => {
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({
      id: 'source-2',
      type: 'HADITH',
      title: 'Bukhari',
    });
    prisma.corpusChunk.create.mockResolvedValue({ id: 'chunk-3' });

    await service.importCorpus(
      { type: 'HADITH', title: 'Bukhari', license: 'approved', language: 'id' },
      [
        {
          originalname: 'hadith.csv',
          mimetype: 'text/csv',
          buffer: Buffer.from(
            'collection,number,text\nBukhari,1,"Baris pertama\nBaris kedua"',
          ),
        },
      ],
    );

    expect(prisma.corpusChunk.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceId: 'source-2',
        content: 'Baris pertama\nBaris kedua',
      }),
    });
  });

  it('rejects json imports with nested values in required fields', async () => {
    prisma.source.findFirst.mockResolvedValue(null);

    await expect(
      service.importCorpus(
        {
          type: 'QURAN',
          title: 'Quran ID',
          license: 'approved',
          language: 'id',
        },
        [
          {
            originalname: 'quran.json',
            mimetype: 'application/json',
            buffer: Buffer.from(
              JSON.stringify([
                { surah: '1', ayah: '1', text: { body: 'bad' } },
              ]),
            ),
          },
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('imports multiple quran json files into one source', async () => {
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({
      id: 'source-3',
      type: 'QURAN',
      title: 'Quran Bulk',
    });
    prisma.corpusChunk.create
      .mockResolvedValueOnce({ id: 'chunk-4' })
      .mockResolvedValueOnce({ id: 'chunk-5' });

    const result = await service.importCorpus(
      {
        type: 'QURAN',
        title: 'Quran Bulk',
        license: 'approved',
        language: 'id',
      },
      [
        {
          originalname: '1.json',
          mimetype: 'application/json',
          buffer: Buffer.from(
            JSON.stringify([
              {
                surah: '1',
                ayah: '1',
                surahName: 'Al-Fatihah',
                text: 'Ayat 1',
              },
            ]),
          ),
        },
        {
          originalname: '2.json',
          mimetype: 'application/json',
          buffer: Buffer.from(
            JSON.stringify([
              {
                surah: '2',
                ayah: '1',
                surahName: 'Al-Baqarah',
                text: 'Ayat 2-1',
              },
            ]),
          ),
        },
      ],
    );

    expect(jobs.enqueueCorpusEmbedding).toHaveBeenCalledTimes(2);
    expect(result.importSummary).toEqual({
      type: 'QURAN',
      fileName: '2 files',
      filesProcessed: ['1.json', '2.json'],
      recordsReceived: 2,
      chunksCreated: 2,
      embeddingJobsQueued: 2,
    });
  });

  it('imports quran surah-object files with translation text', async () => {
    prisma.source.findFirst.mockResolvedValue(null);
    prisma.source.create.mockResolvedValue({
      id: 'source-4',
      type: 'QURAN',
      title: 'Quran Surah JSON',
    });
    prisma.corpusChunk.create
      .mockResolvedValueOnce({ id: 'chunk-6' })
      .mockResolvedValueOnce({ id: 'chunk-7' });

    await service.importCorpus(
      {
        type: 'QURAN',
        title: 'Quran Surah JSON',
        license: 'approved',
        language: 'id',
      },
      [
        {
          originalname: '1.json',
          mimetype: 'application/json',
          buffer: Buffer.from(
            JSON.stringify({
              1: {
                number: '1',
                name_latin: 'Al-Fatihah',
                translations: {
                  id: {
                    text: {
                      1: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
                      2: 'Segala puji bagi Allah, Tuhan seluruh alam,',
                    },
                  },
                },
              },
            }),
          ),
        },
      ],
    );

    expect(prisma.corpusChunk.create).toHaveBeenNthCalledWith(1, {
      data: {
        sourceId: 'source-4',
        content: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
        topic: 'Al-Fatihah',
        metadata: {
          sourceType: 'QURAN',
          surah: '1',
          ayah: '1',
          surahName: 'Al-Fatihah',
          citationLabel: 'QS Al-Fatihah 1:1',
          importRow: 1,
        },
      },
    });
  });
});
