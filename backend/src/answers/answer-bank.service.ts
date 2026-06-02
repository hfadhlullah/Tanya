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

  async findVerifiedMatch(
    questionText: string,
    preferredUstadzIds?: string[],
  ): Promise<AnswerBankMatch | null> {
    const terms = this.extractTerms(questionText);
    if (terms.length === 0) return null;

    const answers = await this.prisma.answer.findMany({
      where: {
        status: AnswerStatus.VERIFIED,
        isSensitive: false,
        OR: [
          ...terms.map((term) => ({
            body: { contains: term, mode: 'insensitive' as const },
          })),
          ...terms.map((term) => ({
            question: {
              text: { contains: term, mode: 'insensitive' as const },
            },
          })),
        ],
      },
      take: 10,
      orderBy: { verifiedAt: 'desc' },
      include: {
        citations: { include: { source: true } },
        verifyingUstadz: {
          select: {
            id: true,
            publicName: true,
            bio: true,
            specialties: true,
            madhhab: true,
            status: true,
          },
        },
        question: { select: { text: true } },
      },
    });

    if (answers.length === 0) return null;

    const scored = answers.map((answer) => {
      const haystack = `${answer.question.text} ${answer.body}`.toLowerCase();
      const score =
        terms.filter((term) => haystack.includes(term)).length / terms.length;
      return { answer, score };
    });

    const qualifying = scored.filter((s) => s.score >= 0.5);
    if (qualifying.length === 0) return null;

    // Prefer answers from user's preferred ustadzs
    if (preferredUstadzIds?.length) {
      const preferred = qualifying.filter(
        (s) =>
          s.answer.verifyingUstadzId &&
          preferredUstadzIds.includes(s.answer.verifyingUstadzId),
      );
      if (preferred.length > 0) {
        preferred.sort((a, b) => b.score - a.score);
        const best = preferred[0];
        return this.toMatch(best.answer);
      }
    }

    qualifying.sort((a, b) => b.score - a.score);
    return this.toMatch(qualifying[0].answer);
  }

  private toMatch(answer: {
    id: string;
    body: string;
    language: string;
    verifyingUstadzId?: string | null;
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
  }): AnswerBankMatch {
    return {
      answerId: answer.id,
      score: 1,
      body: answer.body,
      language: answer.language,
      citations: answer.citations.map((c) => ({
        sourceId: c.sourceId,
        label: c.label,
        excerpt: c.excerpt,
        source: c.source,
      })),
      verifyingUstadz: answer.verifyingUstadz,
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
