import { Injectable } from '@nestjs/common';
import { AnswerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AnswerBankMatch = {
  answerId: string;
  score: number;
  body: string;
  language: string;
  citations: Array<{
    sourceId: string;
    label: string;
    excerpt: string | null;
    source: { id: string; title: string; reference: string | null };
  }>;
  verifyingUstadz: {
    id: string;
    publicName: string;
    bio: string | null;
    specialties: string[];
    madhhab: string | null;
  } | null;
};

@Injectable()
export class AnswerBankService {
  constructor(private readonly prisma: PrismaService) {}

  async findVerifiedMatch(questionText: string): Promise<AnswerBankMatch | null> {
    const terms = this.extractTerms(questionText);
    if (terms.length === 0) return null;

    const answers = await this.prisma.answer.findMany({
      where: {
        status: AnswerStatus.VERIFIED,
        OR: terms.map((term) => ({
          body: { contains: term, mode: 'insensitive' as const },
        })),
      },
      take: 5,
      orderBy: { verifiedAt: 'desc' },
      include: {
        citations: { include: { source: true } },
        verifyingUstadz: {
          select: { id: true, publicName: true, bio: true, specialties: true, madhhab: true },
        },
        question: { select: { text: true } },
      },
    });

    if (answers.length === 0) return null;

    const scored = answers.map((answer) => {
      const haystack = `${answer.question.text} ${answer.body}`.toLowerCase();
      const score = terms.filter((term) => haystack.includes(term)).length / terms.length;
      return { answer, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best.score < 0.5) return null;

    return {
      answerId: best.answer.id,
      score: best.score,
      body: best.answer.body,
      language: best.answer.language,
      citations: best.answer.citations.map((c) => ({
        sourceId: c.sourceId,
        label: c.label,
        excerpt: c.excerpt,
        source: c.source,
      })),
      verifyingUstadz: best.answer.verifyingUstadz,
    };
  }

  private extractTerms(text: string): string[] {
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .map((t) => t.trim())
          .filter((t) => t.length >= 4)
          .slice(0, 8),
      ),
    );
  }
}
