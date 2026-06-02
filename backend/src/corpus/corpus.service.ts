import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCorpusChunkDto } from './dto/create-corpus-chunk.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { ImportCorpusDto } from './dto/import-corpus.dto';

type ImportRow = Record<string, string>;
type ImportedChunk = {
  content: string;
  topic?: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class CorpusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly storage: StorageService,
  ) {}

  createSource(dto: CreateSourceDto) {
    return this.prisma.source.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        reference: dto.reference?.trim(),
        license: dto.license.trim(),
        language: dto.language ?? 'id',
      },
    });
  }

  listSources() {
    return this.prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { corpusChunks: true } } },
    });
  }

  async createChunk(dto: CreateCorpusChunkDto) {
    const source = await this.prisma.source.findUnique({
      where: { id: dto.sourceId },
      select: { id: true },
    });

    if (!source) {
      throw new BadRequestException('sourceId does not exist');
    }

    return this.prisma.$transaction(async (tx) => {
      const chunk = await tx.corpusChunk.create({
        data: {
          sourceId: dto.sourceId,
          content: dto.content.trim(),
          topic: dto.topic?.trim(),
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      await this.jobsService.enqueueCorpusEmbedding(chunk.id, tx);

      return chunk;
    });
  }

  async uploadSourceFile(
    sourceId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const source = await this.prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true },
    });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    const stored = this.storage.store(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return this.prisma.source.update({
      where: { id: sourceId },
      data: { fileUrl: stored.url },
    });
  }

  listChunks(sourceId?: string) {
    return this.prisma.corpusChunk.findMany({
      where: sourceId ? { sourceId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { source: true },
    });
  }

  async importCorpus(
    dto: ImportCorpusDto,
    files: { buffer: Buffer; originalname: string; mimetype: string }[],
  ) {
    const sourceData = {
      type: dto.type,
      title: dto.title.trim(),
      reference: dto.reference?.trim(),
      license: dto.license.trim(),
      language: dto.language ?? 'id',
    };

    const existing = await this.prisma.source.findFirst({
      where: {
        type: sourceData.type,
        title: sourceData.title,
        reference: sourceData.reference,
        language: sourceData.language,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A matching corpus source already exists');
    }

    const rows = files.flatMap((file) => this.parseImportFile(dto.type, file));

    if (rows.length === 0) {
      throw new BadRequestException('Import file has no usable records');
    }

    const preparedChunks = rows.map((row, index) =>
      this.prepareImportedChunk(dto.type, row, index),
    );

    return this.prisma.$transaction(async (tx) => {
      const source = await tx.source.create({ data: sourceData });
      const createdChunks = await Promise.all(
        preparedChunks.map((chunk) =>
          tx.corpusChunk.create({
            data: {
              sourceId: source.id,
              content: chunk.content,
              topic: chunk.topic,
              metadata: chunk.metadata as Prisma.InputJsonValue,
            },
          }),
        ),
      );

      await Promise.all(
        createdChunks.map((chunk) =>
          this.jobsService.enqueueCorpusEmbedding(chunk.id, tx),
        ),
      );

      return {
        source,
        importSummary: {
          type: dto.type,
          fileName:
            files.length === 1
              ? files[0].originalname
              : `${files.length} files`,
          filesProcessed: files.map((file) => file.originalname),
          recordsReceived: rows.length,
          chunksCreated: createdChunks.length,
          embeddingJobsQueued: createdChunks.length,
        },
      };
    });
  }

  private parseImportFile(
    type: ImportCorpusDto['type'],
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    const raw = file.buffer.toString('utf8').trim();

    if (!raw) {
      throw new BadRequestException('Import file is empty');
    }

    const isJson =
      file.mimetype.includes('json') ||
      file.originalname.toLowerCase().endsWith('.json');
    const isCsv =
      file.mimetype.includes('csv') ||
      file.mimetype.includes('text/plain') ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (!isJson && !isCsv) {
      throw new BadRequestException(
        'Only JSON and CSV corpus imports are supported',
      );
    }

    const rows = isJson ? this.parseJsonRows(raw) : this.parseCsvRows(raw);
    this.validateImportRows(type, rows);
    return rows;
  }

  private parseJsonRows(raw: string): ImportRow[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Invalid JSON import file');
    }

    const { records, injected } = this.extractJsonRecords(parsed);

    if (!records) {
      throw new BadRequestException(
        'JSON import must be an array, an object with a records-like array, or a per-surah object with ayah collections',
      );
    }

    return records.map((record, index) => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new BadRequestException(`Record ${index + 1} must be an object`);
      }

      const merged = { ...injected, ...(record as Record<string, unknown>) };
      return Object.fromEntries(
        Object.entries(merged)
          .filter(([, value]) => this.isScalarValue(value))
          .map(([key, value]) => [
            key,
            this.normalizeImportValue(value, key, index),
          ]),
      );
    });
  }

  private isScalarValue(value: unknown): boolean {
    return (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  }

  private extractJsonRecords(parsed: unknown): {
    records: unknown[] | null;
    injected: Record<string, unknown>;
  } {
    if (Array.isArray(parsed)) {
      return { records: parsed as unknown[], injected: {} };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { records: null, injected: {} };
    }

    const object = parsed as Record<string, unknown>;

    const surahRecord = this.extractSurahRecords(object);
    if (surahRecord) {
      return { records: surahRecord, injected: {} };
    }

    const scalarMeta: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(object)) {
      if (this.isScalarValue(value)) {
        scalarMeta[key] = value;
      }
    }

    const hadithKeys = ['hadiths', 'hadith'];
    for (const key of hadithKeys) {
      if (Array.isArray(object[key])) {
        const nameField =
          typeof object['name'] === 'string'
            ? object['name']
            : typeof object['id'] === 'string'
              ? object['id']
              : undefined;
        const injected: Record<string, unknown> = nameField
          ? { collection: nameField }
          : {};
        return { records: object[key] as unknown[], injected };
      }
    }

    const arrayKeys = [
      'records',
      'data',
      'items',
      'ayahs',
      'verses',
      'ayaTranslation',
    ];

    for (const key of arrayKeys) {
      if (Array.isArray(object[key])) {
        return { records: object[key] as unknown[], injected: {} };
      }
    }

    const numericEntries = Object.entries(object).filter(([key]) =>
      /^\d+$/.test(key),
    );
    if (numericEntries.length > 0) {
      return {
        records: numericEntries.map(([ayah, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            return { ayah, ...(value as Record<string, unknown>) };
          }

          return { ayah, text: value };
        }),
        injected: {},
      };
    }

    return { records: null, injected: {} };
  }

  private extractSurahRecords(object: Record<string, unknown>) {
    const topLevelEntries = Object.entries(object);
    if (topLevelEntries.length !== 1) {
      return null;
    }

    const [surahKey, surahValue] = topLevelEntries[0];
    if (
      !/^\d+$/.test(surahKey) ||
      !surahValue ||
      typeof surahValue !== 'object' ||
      Array.isArray(surahValue)
    ) {
      return null;
    }

    const surah = surahValue as Record<string, unknown>;
    const translationText = this.getNestedRecord(surah, [
      'translations',
      'id',
      'text',
    ]);
    const arabicText = this.getNestedRecord(surah, ['text']);
    const ayahSource = translationText ?? arabicText;

    if (!ayahSource) {
      return null;
    }

    const surahNumber =
      typeof surah.number === 'string' || typeof surah.number === 'number'
        ? String(surah.number)
        : surahKey;
    const surahName =
      typeof surah.name_latin === 'string'
        ? surah.name_latin
        : typeof surah.name === 'string'
          ? surah.name
          : undefined;

    return Object.entries(ayahSource)
      .filter(([ayah]) => /^\d+$/.test(ayah))
      .map(([ayah, text]) => ({
        surah: surahNumber,
        ayah,
        surahName,
        text,
      }));
  }

  private getNestedRecord(object: Record<string, unknown>, path: string[]) {
    let current: unknown = object;

    for (const key of path) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return null;
      }

      current = (current as Record<string, unknown>)[key];
    }

    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return null;
    }

    return current as Record<string, unknown>;
  }

  private parseCsvRows(raw: string): ImportRow[] {
    const rows = this.parseCsvGrid(raw)
      .map((row) => row.map((value) => value.trim()))
      .filter((row) => row.some(Boolean));

    if (rows.length < 2) {
      throw new BadRequestException(
        'CSV import must include a header row and at least one record',
      );
    }

    const headers = rows[0];
    return rows.slice(1).map((values, index) => {
      if (values.length !== headers.length) {
        throw new BadRequestException(
          `CSV row ${index + 2} has ${values.length} columns, expected ${headers.length}`,
        );
      }

      return Object.fromEntries(
        headers.map((header, headerIndex) => [
          header,
          values[headerIndex] ?? '',
        ]),
      );
    });
  }

  private parseCsvGrid(raw: string) {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];

      if (char === '"') {
        if (inQuotes && raw[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && raw[i + 1] === '\n') {
          i += 1;
        }

        currentRow.push(current);
        rows.push(currentRow);
        currentRow = [];
        current = '';
        continue;
      }

      current += char;
    }

    if (inQuotes) {
      throw new BadRequestException(
        'CSV import contains an unclosed quoted field',
      );
    }

    currentRow.push(current);
    rows.push(currentRow);
    return rows;
  }

  private validateImportRows(type: ImportCorpusDto['type'], rows: ImportRow[]) {
    if (type === 'QURAN') {
      rows.forEach((row, index) => {
        for (const field of ['surah', 'ayah', 'text']) {
          if (!row[field]?.trim()) {
            throw new BadRequestException(
              `Record ${index + 1} is missing required field: ${field}`,
            );
          }
        }
      });
      return;
    }

    rows.forEach((row, index) => {
      if (!row['collection']?.trim()) {
        throw new BadRequestException(
          `Record ${index + 1} is missing required field: collection`,
        );
      }

      const hasNumber =
        row['number']?.trim() || row['hadithnumber']?.trim();
      if (!hasNumber) {
        throw new BadRequestException(
          `Record ${index + 1} is missing required field: number`,
        );
      }

      const hasText =
        row['text']?.trim() || row['id']?.trim() || row['arab']?.trim();
      if (!hasText) {
        throw new BadRequestException(
          `Record ${index + 1} is missing required field: text`,
        );
      }
    });
  }

  private prepareImportedChunk(
    type: ImportCorpusDto['type'],
    row: ImportRow,
    index: number,
  ): ImportedChunk {
    if (type === 'QURAN') {
      const surah = row.surah.trim();
      const ayah = row.ayah.trim();
      const surahName = row.surahName?.trim() || row.surah_name?.trim();
      const text = row.text.trim();
      const citationLabel = surahName
        ? `QS ${surahName} ${surah}:${ayah}`
        : `QS ${surah}:${ayah}`;

      return {
        content: text,
        topic: row.topic?.trim() || surahName || `Surah ${surah}`,
        metadata: {
          sourceType: type,
          surah,
          ayah,
          surahName: surahName || undefined,
          citationLabel,
          importRow: index + 1,
        },
      };
    }

    const collection = row.collection.trim();
    const number = (row.number ?? row.hadithnumber ?? '').trim();
    const grade = row.grade?.trim();
    const book = row.book?.trim();
    const chapter = row.chapter?.trim();
    const text = (row.text ?? row.id ?? row.arab ?? '').trim();
    const citationLabel = [
      collection,
      number ? `No. ${number}` : null,
      grade || null,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      content: text,
      topic: row.topic?.trim() || collection,
      metadata: {
        sourceType: type,
        collection,
        number,
        grade: grade || undefined,
        book: book || undefined,
        chapter: chapter || undefined,
        citationLabel,
        importRow: index + 1,
      },
    };
  }

  private normalizeImportValue(value: unknown, _key: string, _index: number) {
    if (value == null) {
      return '';
    }

    return String(value);
  }
}
