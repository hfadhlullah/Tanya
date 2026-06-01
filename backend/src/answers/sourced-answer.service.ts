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

    const body = await this.synthesizeAnswer(question.text, matches);

    const answer = await tx.answer.create({
      data: {
        questionId: question.id,
        body,
        status: AnswerStatus.AI_PENDING,
        language: question.language,
        citations: matches.length > 0 ? {
          create: matches.map((match) => ({
            sourceId: match.sourceId,
            label: this.getCitationLabel(match),
            excerpt: match.content.slice(0, 500),
          })),
        } : undefined,
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

    const hasCorpus = matches.length > 0;
    return {
      ...answer,
      label: hasCorpus
        ? "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz"
        : 'Jawaban AI · belum ditinjau ustadz',
      verified: false,
    };
  }

  private getCitationLabel(match: { source: { reference: string | null; title: string }; metadata?: unknown }) {
    const metadata = match.metadata;
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const citationLabel = (metadata as { citationLabel?: unknown }).citationLabel;
      if (typeof citationLabel === 'string' && citationLabel.trim()) {
        return citationLabel.trim();
      }
    }

    return match.source.reference ?? match.source.title;
  }

  private async synthesizeAnswer(
    questionText: string,
    matches: Awaited<ReturnType<CorpusRetrievalService['findSourceMatches']>>,
  ): Promise<string> {
    const hasContext = matches.length > 0;
    const sources = hasContext
      ? matches.map((m, i) => `[${i + 1}] ${m.content.slice(0, 500)}`).join('\n\n')
      : null;

    const userContent = hasContext
      ? `Pertanyaan: ${questionText}\n\nSumber relevan:\n${sources}\n\nBerikan jawaban berdasarkan sumber di atas.`
      : `Pertanyaan: ${questionText}\n\nJawab berdasarkan pengetahuan Islam dari Al-Qur'an dan Sunnah.`;

    try {
      return await this.llm.complete([
        {
          role: 'system',
          content:
            'Kamu adalah asisten yang menjawab pertanyaan Islam berdasarkan Al-Qur\'an dan Sunnah. ' +
            'Jawaban harus ringkas dan jelas. Jangan berfatwa secara personal. ' +
            'Jika pertanyaan bukan tentang Islam, sampaikan dengan sopan bahwa kamu hanya bisa menjawab pertanyaan seputar Islam.',
        },
        { role: 'user', content: userContent },
      ]);
    } catch {
      if (!hasContext) return 'Maaf, tidak dapat memproses pertanyaan saat ini. Coba lagi sebentar.';
      return [
        'Berikut sumber awal yang relevan. Jawaban ini belum ditinjau ustadz.',
        matches.map((m) => `- ${m.content}`).join('\n'),
      ].join('\n\n');
    }
  }
}
