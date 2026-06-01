import { Injectable } from '@nestjs/common';
import { AnswerStatus, QuestionStatus } from '@prisma/client';
import { CorpusRetrievalService, type CorpusTx } from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';

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
  constructor(
    private readonly corpusRetrievalService: CorpusRetrievalService,
    private readonly llm: LlmClientService,
  ) {}

  async createTierOneAnswer(question: { id: string; text: string; language: string }, tx: AnswerTx) {
    const embedding = await this.corpusRetrievalService.embedQuestion(question.text);
    const matches = await this.corpusRetrievalService.findSourceMatches(question.text, embedding, tx);

    if (matches.length === 0) {
      return null;
    }

    const body = await this.synthesizeAnswer(question.text, matches);

    const answer = await tx.answer.create({
      data: {
        questionId: question.id,
        body,
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

  private async synthesizeAnswer(
    questionText: string,
    matches: Awaited<ReturnType<CorpusRetrievalService['findSourceMatches']>>,
  ): Promise<string> {
    const sources = matches
      .map((m, i) => `[${i + 1}] ${m.content.slice(0, 500)}`)
      .join('\n\n');

    try {
      return await this.llm.complete([
        {
          role: 'system',
          content:
            'Kamu adalah asisten yang menjawab pertanyaan Islam berdasarkan sumber Al-Qur\'an dan Sunnah. ' +
            'Jawaban harus ringkas, jelas, dan sesuai dengan sumber yang diberikan. ' +
            'Jangan berfatwa secara personal. Sebutkan nomor sumber yang kamu gunakan.',
        },
        {
          role: 'user',
          content: `Pertanyaan: ${questionText}\n\nSumber relevan:\n${sources}\n\nBerikan jawaban berdasarkan sumber di atas.`,
        },
      ]);
    } catch {
      // fallback to raw excerpts if LLM call fails
      return [
        'Berikut sumber awal yang relevan. Jawaban ini belum ditinjau ustadz.',
        matches.map((m) => `- ${m.content}`).join('\n'),
      ].join('\n\n');
    }
  }
}
