import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CorpusTx = {
  corpusChunk: {
    findMany: (args: unknown) => any;
  };
};

@Injectable()
export class CorpusRetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  findSourceMatches(questionText: string, tx: CorpusTx = this.prisma) {
    const terms = this.extractTerms(questionText);

    if (terms.length === 0) {
      return tx.corpusChunk.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      });
    }

    return tx.corpusChunk.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { content: { contains: term, mode: 'insensitive' as const } },
          { topic: { contains: term, mode: 'insensitive' as const } },
        ]),
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { source: true },
    });
  }

  private extractTerms(text: string) {
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .map((term) => term.trim())
          .filter((term) => term.length >= 4)
          .slice(0, 6),
      ),
    );
  }
}
