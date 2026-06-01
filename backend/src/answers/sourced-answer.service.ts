import { Injectable } from '@nestjs/common';
import { AnswerStatus, QuestionStatus } from '@prisma/client';
import { CorpusRetrievalService, type CorpusTx } from './corpus-retrieval.service';

type AnswerTx = CorpusTx & {
  answer: {
    create: (args: unknown) => any;
  };
  question: {
    update: (args: { where: { id: string }; data: { status: QuestionStatus } }) => any;
  };
};

@Injectable()
export class SourcedAnswerService {
  constructor(private readonly corpusRetrievalService: CorpusRetrievalService) {}

  async createTierOneAnswer(question: { id: string; text: string; language: string }, tx: AnswerTx) {
    const matches = await this.corpusRetrievalService.findSourceMatches(question.text, tx);

    if (matches.length === 0) {
      return null;
    }

    const answer = await tx.answer.create({
      data: {
        questionId: question.id,
        body: this.composeAnswer(matches),
        status: AnswerStatus.AI_PENDING,
        language: question.language,
        citations: {
          create: matches.map((match) => ({
            sourceId: match.sourceId,
            label: match.source.reference ?? match.source.title,
            excerpt: match.content.slice(0, 500),
          })),
        },
      },
      include: {
        citations: { include: { source: true } },
        verifyingUstadz: true,
      },
    });

    await tx.question.update({
      where: { id: question.id },
      data: { status: QuestionStatus.ANSWERED_SOURCE },
    });

    return {
      ...answer,
      label: "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz",
      verified: false,
    };
  }

  private composeAnswer(matches: Awaited<ReturnType<CorpusRetrievalService['findSourceMatches']>>) {
    const excerpts = matches.map((match) => `- ${match.content}`).join('\n');

    return [
      'Berikut sumber awal yang relevan. Jawaban ini belum ditinjau ustadz, jadi belum menjadi fatwa atau arahan personal.',
      excerpts,
    ].join('\n\n');
  }
}
