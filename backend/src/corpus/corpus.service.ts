import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorpusChunkDto } from './dto/create-corpus-chunk.dto';
import { CreateSourceDto } from './dto/create-source.dto';

@Injectable()
export class CorpusService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.corpusChunk.create({
      data: {
        sourceId: dto.sourceId,
        content: dto.content.trim(),
        topic: dto.topic?.trim(),
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
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
