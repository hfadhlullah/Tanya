import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClientService } from './llm-client.service';

export type CorpusTx = {
  corpusChunk: {
    findMany: (args: unknown) => any;
  };
};

@Injectable()
export class CorpusRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClientService,
  ) {}

  async embedQuestion(text: string): Promise<number[] | null> {
    try {
      return await this.llm.embed(text);
    } catch {
      return null;
    }
  }

  async findSourceMatches(
    questionText: string,
    embedding: number[] | null = null,
    tx: CorpusTx = this.prisma,
  ) {
    if (embedding && embedding.length > 0) {
      return this.findByEmbedding(embedding);
    }
    return this.findByKeyword(questionText, tx);
  }

  private async findByEmbedding(embedding: number[]) {
    const vectorLiteral = `[${embedding.join(',')}]`;
    // pgvector cosine distance operator: <=>
    const results = await this.prisma.$queryRaw<
      { id: string; content: string; topic: string | null; sourceId: string }[]
    >`
      SELECT cc.id, cc.content, cc.topic, cc."sourceId"
      FROM "CorpusChunk" cc
      WHERE cc.embedding IS NOT NULL
      ORDER BY cc.embedding <=> ${vectorLiteral}::vector
      LIMIT 5
    `;

    if (results.length === 0) return [];

    const ids = results.map((r) => r.id);
    return this.prisma.corpusChunk.findMany({
      where: { id: { in: ids } },
      include: { source: true },
    });
  }

  private findByKeyword(questionText: string, tx: CorpusTx) {
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
      take: 5,
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
