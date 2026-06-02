import { Injectable } from '@nestjs/common';
import { type CorpusChunk, type Source, type Prisma, SourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClientService } from './llm-client.service';

export type CorpusMatch = CorpusChunk & { source: Source };

export type CorpusTx = {
  corpusChunk: { findMany: (args: unknown) => Promise<any> };
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
    preferredUstadzId?: string,
  ) {
    if (embedding && embedding.length > 0) {
      if (process.env.ENABLE_GRAPH_RAG === 'true') {
        const graphMatches = await this.findByEmbeddingWithGraph(
          embedding,
          questionText,
          preferredUstadzId,
        );
        if (graphMatches.length > 0) return graphMatches;
      } else {
        const vectorMatches = await this.findByEmbedding(embedding, questionText, preferredUstadzId);
        if (vectorMatches.length > 0) {
          return vectorMatches;
        }
      }
    }
    return this.findByKeyword(questionText, tx, preferredUstadzId);
  }

  private async findByEmbeddingWithGraph(
    embedding: number[],
    questionText: string,
    preferredUstadzId?: string,
  ): Promise<CorpusMatch[]> {
    const vectorMatches = await this.findByEmbedding(embedding, questionText, preferredUstadzId);
    if (vectorMatches.length === 0) return [];

    const chunkIds = vectorMatches.map((m) => m.id);
    const db = this.prisma as any;

    const mentions = await db.entityMention.findMany({
      where: { corpusChunkId: { in: chunkIds } },
      include: {
        entity: {
          include: {
            sourceRelations: { select: { targetId: true } },
            targetRelations: { select: { sourceId: true } },
          },
        },
      },
    });

    const neighborEntityIds = new Set<string>();
    for (const mention of mentions as any[]) {
      for (const rel of mention.entity.sourceRelations as any[]) {
        neighborEntityIds.add(rel.targetId as string);
      }
      for (const rel of mention.entity.targetRelations as any[]) {
        neighborEntityIds.add(rel.sourceId as string);
      }
    }

    if (neighborEntityIds.size === 0) return vectorMatches;

    const neighborMentions = await db.entityMention.findMany({
      where: {
        entityId: { in: [...neighborEntityIds] },
        corpusChunkId: { notIn: chunkIds },
      },
      select: { corpusChunkId: true },
    });

    const neighborChunkIds = [
      ...new Set((neighborMentions as any[]).map((m: any) => m.corpusChunkId as string)),
    ];

    if (neighborChunkIds.length === 0) return vectorMatches;

    const neighborChunks = await this.prisma.corpusChunk.findMany({
      where: { id: { in: neighborChunkIds } },
      include: { source: true },
    });

    const seen = new Set(chunkIds);
    const uniqueNeighbors = neighborChunks.filter((c) => !seen.has(c.id));

    return [...vectorMatches, ...(uniqueNeighbors as CorpusMatch[])].slice(0, 10);
  }

  private async findByEmbedding(
    embedding: number[],
    questionText: string,
    preferredUstadzId?: string,
  ): Promise<CorpusMatch[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;

    const [quranResults, hadithResults] = await Promise.all([
      this.prisma.$queryRaw<
        { id: string; content: string; topic: string | null; sourceId: string }[]
      >`
        SELECT cc.id, cc.content, cc.topic, cc."sourceId"
        FROM "CorpusChunk" cc
        JOIN "Source" s ON s.id = cc."sourceId"
        WHERE cc.embedding IS NOT NULL AND s.type = 'QURAN'::"SourceType"
        ORDER BY cc.embedding <=> ${vectorLiteral}::vector
        LIMIT 3
      `,
      this.prisma.$queryRaw<
        { id: string; content: string; topic: string | null; sourceId: string }[]
      >`
        SELECT cc.id, cc.content, cc.topic, cc."sourceId"
        FROM "CorpusChunk" cc
        JOIN "Source" s ON s.id = cc."sourceId"
        WHERE cc.embedding IS NOT NULL AND s.type = 'HADITH'::"SourceType"
        ORDER BY cc.embedding <=> ${vectorLiteral}::vector
        LIMIT 3
      `,
    ]);

    // Prefer chunks from the selected ustadz; fall back to any ustadz corpus.
    let ustadzResults: { id: string; content: string; topic: string | null; sourceId: string }[] = [];
    if (preferredUstadzId) {
      ustadzResults = await this.prisma.$queryRaw<
        { id: string; content: string; topic: string | null; sourceId: string }[]
      >`
        SELECT cc.id, cc.content, cc.topic, cc."sourceId"
        FROM "CorpusChunk" cc
        JOIN "Source" s ON s.id = cc."sourceId"
        WHERE cc.embedding IS NOT NULL
          AND s.type = 'USTADZ_CONTENT'::"SourceType"
          AND s.reference = ${preferredUstadzId}
        ORDER BY cc.embedding <=> ${vectorLiteral}::vector
        LIMIT 2
      `;
    }
    if (ustadzResults.length === 0) {
      ustadzResults = await this.prisma.$queryRaw<
        { id: string; content: string; topic: string | null; sourceId: string }[]
      >`
        SELECT cc.id, cc.content, cc.topic, cc."sourceId"
        FROM "CorpusChunk" cc
        JOIN "Source" s ON s.id = cc."sourceId"
        WHERE cc.embedding IS NOT NULL AND s.type = 'USTADZ_CONTENT'::"SourceType"
        ORDER BY cc.embedding <=> ${vectorLiteral}::vector
        LIMIT 1
      `;
    }

    // Keyword supplement: if vector search found no ustadz chunks (embeddings not
    // yet computed), fall back to keyword search so new ustadz reviews are surfaced
    // immediately without waiting for the embedding worker to process them.
    if (ustadzResults.length === 0) {
      const terms = this.extractTerms(questionText);
      if (terms.length > 0) {
        const sourceWhere: Prisma.SourceWhereInput = preferredUstadzId
          ? { type: SourceType.USTADZ_CONTENT, reference: preferredUstadzId }
          : { type: SourceType.USTADZ_CONTENT };
        const keywordChunks = await this.prisma.corpusChunk.findMany({
          where: {
            source: sourceWhere,
            OR: terms.flatMap((term) => [
              { content: { contains: term, mode: 'insensitive' as const } },
              { topic: { contains: term, mode: 'insensitive' as const } },
            ]),
          },
          take: 2,
          orderBy: { createdAt: 'desc' },
          include: { source: true },
        });
        if (keywordChunks.length > 0) {
          const quranHadithIds = [...quranResults, ...hadithResults].map((r) => r.id);
          const quranHadithChunks = quranHadithIds.length > 0
            ? await this.prisma.corpusChunk.findMany({
                where: { id: { in: quranHadithIds } },
                include: { source: true },
              })
            : [];
          return [...quranHadithChunks, ...(keywordChunks as CorpusMatch[])];
        }
      }
    }

    const allResults = [...quranResults, ...hadithResults, ...ustadzResults];
    if (allResults.length === 0) return [];

    const seen = new Set<string>();
    const uniqueIds = allResults
      .filter((r) => !seen.has(r.id) && seen.add(r.id))
      .map((r) => r.id);

    return this.prisma.corpusChunk.findMany({
      where: { id: { in: uniqueIds } },
      include: { source: true },
    });
  }

  private async findByKeyword(
    questionText: string,
    tx: CorpusTx,
    preferredUstadzId?: string,
  ): Promise<CorpusMatch[]> {
    const terms = this.extractTerms(questionText);
    const db = tx as typeof this.prisma;

    const baseWhere = (type: SourceType): Prisma.CorpusChunkWhereInput =>
      terms.length === 0
        ? { source: { type } }
        : {
            source: { type },
            OR: terms.flatMap((term) => [
              { content: { contains: term, mode: 'insensitive' as const } },
              { topic: { contains: term, mode: 'insensitive' as const } },
            ]),
          };

    const [quranChunks, hadithChunks] = await Promise.all([
      db.corpusChunk.findMany({
        where: baseWhere(SourceType.QURAN),
        take: terms.length === 0 ? 1 : 3,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      }),
      db.corpusChunk.findMany({
        where: baseWhere(SourceType.HADITH),
        take: terms.length === 0 ? 1 : 3,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      }),
    ]);

    // Prefer preferred ustadz; fall back to any USTADZ_CONTENT.
    let ustadzChunks: CorpusMatch[] = [];
    if (preferredUstadzId) {
      const preferredWhere: Prisma.CorpusChunkWhereInput =
        terms.length === 0
          ? { source: { type: SourceType.USTADZ_CONTENT, reference: preferredUstadzId } }
          : {
              source: { type: SourceType.USTADZ_CONTENT, reference: preferredUstadzId },
              OR: terms.flatMap((term) => [
                { content: { contains: term, mode: 'insensitive' as const } },
                { topic: { contains: term, mode: 'insensitive' as const } },
              ]),
            };
      ustadzChunks = (await db.corpusChunk.findMany({
        where: preferredWhere,
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      })) as CorpusMatch[];
    }
    if (ustadzChunks.length === 0) {
      ustadzChunks = (await db.corpusChunk.findMany({
        where: baseWhere(SourceType.USTADZ_CONTENT),
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: { source: true },
      })) as CorpusMatch[];
    }

    return [...(quranChunks as CorpusMatch[]), ...(hadithChunks as CorpusMatch[]), ...ustadzChunks];
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
