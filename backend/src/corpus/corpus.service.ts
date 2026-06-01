import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateCorpusChunkDto } from './dto/create-corpus-chunk.dto';
import { CreateSourceDto } from './dto/create-source.dto';

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
    const source = await this.prisma.source.findUnique({ where: { id: sourceId }, select: { id: true } });

    if (!source) {
      throw new NotFoundException('Source not found');
    }

    const stored = await this.storage.store(file.buffer, file.originalname, file.mimetype);

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
}
