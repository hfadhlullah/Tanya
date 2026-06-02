import { Injectable } from '@nestjs/common';
import { AnswerStatus, QuestionStatus } from '@prisma/client';
import {
  CorpusRetrievalService,
  type CorpusMatch,
  type CorpusTx,
} from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';

type AnswerTx = CorpusTx & {
  answer: { create: (args: unknown) => Promise<any> };

  question: {
    update: (args: {
      where: { id: string };
      data: { status: QuestionStatus };
    }) => Promise<any>;
  };
};

@Injectable()
export class SourcedAnswerService {
  constructor(
    private readonly corpusRetrievalService: CorpusRetrievalService,
    private readonly llm: LlmClientService,
  ) {}

  async createTierOneAnswer(
    question: {
      id: string;
      text: string;
      language: string;
      preferredUstadzId?: string | null;
    },
    tx: AnswerTx,
  ) {
    const embedding = await this.corpusRetrievalService.embedQuestion(
      question.text,
    );
    const matches = await this.corpusRetrievalService.findSourceMatches(
      question.text,
      embedding,
      tx,
      question.preferredUstadzId ?? undefined,
    );

    const { body, usedMatches } = await this.synthesizeAnswer(
      question.text,
      matches,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const answer = await tx.answer.create({
      data: {
        questionId: question.id,
        body,
        status: AnswerStatus.AI_PENDING,
        language: question.language,
        citations:
          usedMatches.length > 0
            ? {
                create: usedMatches.map((match) => ({
                  sourceId: match.sourceId,
                  label: this.getCitationLabel(match),
                  excerpt: match.content.slice(0, 500),
                })),
              }
            : undefined,
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

    const hasCorpus = usedMatches.length > 0;
    const hasUstadzCorpus = usedMatches.some(
      (m) => m.source.type === 'USTADZ_CONTENT',
    );
    const label = hasCorpus
      ? hasUstadzCorpus
        ? "Dari Al-Qur'an, Sunnah & Ustadz · belum diverifikasi"
        : "Dari Al-Qur'an & Sunnah · belum ditinjau ustadz"
      : 'Jawaban AI · belum ditinjau ustadz';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return { ...answer, label, verified: false };
  }

  async createConversationalAnswer(
    question: {
      id: string;
      text: string;
      language: string;
      preferredUstadzId?: string | null;
    },
    tx: AnswerTx,
  ) {
    let body: string;

    try {
      body = await this.llm.complete([
        {
          role: 'system',
          content:
            'You are an Islamic Q&A assistant. This user message is casual conversation, not a request for Quran, Hadith, or scholarly sourcing. ' +
            'Reply in warm, natural Indonesian like a thoughtful Muslim or Muslimah: friendly, calm, respectful, and full of adab, but not strict or preachy. ' +
            'Keep it short, conversational, and helpful. Do not mention missing sources, corpus retrieval, or ustadz review unless the user asks about Islamic guidance.',
        },
        { role: 'user', content: question.text },
      ]);
    } catch {
      body = 'Halo. Ada yang ingin kamu tanyakan hari ini?';
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const answer = await tx.answer.create({
      data: {
        questionId: question.id,
        body: body.trim(),
        status: AnswerStatus.AI_PENDING,
        language: question.language,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return { ...answer, label: null, verified: false };
  }

  private getCitationLabel(match: CorpusMatch) {
    if (match.source.type === 'USTADZ_CONTENT') {
      return match.source.title;
    }

    const metadata = match.metadata;
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const citationLabel = (metadata as { citationLabel?: unknown })
        .citationLabel;
      if (typeof citationLabel === 'string' && citationLabel.trim()) {
        return citationLabel.trim();
      }
    }

    return match.source.reference ?? match.source.title;
  }

  private async synthesizeAnswer(
    questionText: string,
    matches: Awaited<ReturnType<CorpusRetrievalService['findSourceMatches']>>,
  ): Promise<{ body: string; usedMatches: CorpusMatch[] }> {
    // Tag each retrieved chunk with a stable marker (S1, S2, ...) so the LLM
    // can report exactly which sources it actually used.
    const markerOf = (i: number) => `S${i + 1}`;
    const labelled = matches.map((match, i) => ({
      marker: markerOf(i),
      match,
    }));

    // Only build context blocks + answering rules for source types that were
    // actually retrieved. Absent types are omitted entirely so the LLM cannot
    // fabricate, e.g., an ustadz opinion when no USTADZ_CONTENT chunk exists.
    const sections: Array<{
      heading: string;
      rule: string;
      type: string;
    }> = [
      {
        type: 'QURAN',
        heading: 'QURAN',
        rule: 'Explain what the Quran context says.',
      },
      {
        type: 'HADITH',
        heading: 'HADITS',
        rule: 'Explain what the Hadits context says.',
      },
      {
        type: 'USTADZ_CONTENT',
        heading: 'USTADZ_REVIEW',
        rule: 'If the Ustadz review context is relevant to the question, explain what it says. If the Ustadz content is unclear, unrelated, or not meaningful for this question, skip the Ustadz section entirely — do not invent an ustadz opinion.',
      },
    ];

    const presentSections = sections
      .map((section) => ({
        ...section,
        items: labelled.filter((l) => l.match.source.type === section.type),
      }))
      .filter((section) => section.items.length > 0);

    // No corpus context at all → generic AI answer, no source sections.
    if (presentSections.length === 0) {
      try {
        const body = await this.llm.complete([
          {
            role: 'system',
            content:
              'You are an Islamic Q&A assistant. Speak like a thoughtful Muslim or ' +
              'Muslimah: warm, calm, respectful, and full of adab, but not strict or ' +
              'preachy. There is no retrieved corpus context for this question. ' +
              'Answer briefly and humbly in Indonesian, state that there is no ' +
              'specific source available, and do not invent Quran verses, Hadits, or ' +
              'ustadz opinions.',
          },
          { role: 'user', content: questionText },
        ]);
        return { body: body.trim(), usedMatches: [] };
      } catch {
        return {
          body: 'Maaf, tidak dapat memproses pertanyaan saat ini. Coba lagi sebentar.',
          usedMatches: [],
        };
      }
    }

    const contextBlocks = presentSections
      .map(
        (section) =>
          `[${section.heading}]\n` +
          section.items
            .map((l) => `[${l.marker}] ${l.match.content.slice(0, 500)}`)
            .join('\n\n'),
      )
      .join('\n\n');

    const userContent =
      `Pertanyaan:\n${questionText}\n\n` +
      `Retrieved Context (setiap potongan diberi penanda seperti [S1]):\n\n` +
      contextBlocks;

    const hasUstadz = presentSections.some((s) => s.type === 'USTADZ_CONTENT');
    const sourceRules = presentSections
      .map((section) => `- ${section.rule}`)
      .join('\n');

    const systemPrompt =
      'You are an Islamic Q&A assistant that answers based only on the provided RAG context. ' +
      'Speak like a thoughtful Muslim or Muslimah: warm, calm, respectful, and full of adab, ' +
      'but not strict, preachy, or judgmental.\n\n' +
      'Your task:\n' +
      "Answer the user's question by combining and summarizing only the corpus " +
      'sources provided below.\n\n' +
      'Answering rules:\n' +
      '- Answer in Indonesian.\n' +
      '- Make the answer clear, natural, and narrative.\n' +
      '- Let the tone feel like a kind Muslim friend who menjaga adab and speaks gently.\n' +
      "- Also add some bold to some words or phrases to emphasize important points. Don't overdo it, maybe just a few bold words in each section.\n" +
      sourceRules +
      '\n' +
      '- After that, give one combined conclusion.\n' +
      '- Do not invent information outside the provided context.\n' +
      '- Only use context chunks that are actually relevant to the question; ignore the rest.\n' +
      '- IMPORTANT: Never fabricate ustadz opinions. Only include an ustadz section if the Ustadz review context directly addresses the question.\n' +
      (hasUstadz
        ? ''
        : '- Do NOT mention or invent any ustadz opinion; no Ustadz review context was provided.\n') +
      '- Do not give a legal ruling stronger than the retrieved context supports.\n' +
      '- Use gentle wording such as "berdasarkan konteks yang tersedia".\n' +
      '- Avoid sounding too robotic or overly academic.\n' +
      '- Avoid sounding harsh, scolding, or like you are lecturing the user.\n\n' +
      'Output format:\n' +
      'Start with a direct answer, then explain each provided source narratively, then end with a short conclusion.\n' +
      'After the conclusion, on the very last line, output exactly:\n' +
      'SUMBER: <comma-separated markers you actually used, e.g. S1, S3>\n' +
      'List only markers whose context you genuinely relied on. If you used none, output "SUMBER: -".';

    let raw: string;
    try {
      raw = await this.llm.complete([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ]);
    } catch {
      return {
        body: 'Maaf, tidak dapat memproses pertanyaan saat ini. Coba lagi sebentar.',
        usedMatches: [],
      };
    }

    return this.parseUsedMatches(raw, labelled);
  }

  private parseUsedMatches(
    raw: string,
    labelled: Array<{ marker: string; match: CorpusMatch }>,
  ): { body: string; usedMatches: CorpusMatch[] } {
    const sumberMatch = raw.match(/^\s*SUMBER\s*:\s*(.*)$/im);
    if (!sumberMatch) {
      // LLM omitted the marker line — fall back to all matches.
      return { body: raw.trim(), usedMatches: labelled.map((l) => l.match) };
    }

    let body = raw.replace(sumberMatch[0], '').trim();
    const usedMarkers = new Set(
      (sumberMatch[1].match(/S\d+/gi) ?? []).map((m: string) =>
        m.toUpperCase(),
      ),
    );
    const usedMatches = labelled
      .filter((l) => usedMarkers.has(l.marker))
      .map((l) => l.match);

    // Replace inline markers like (S1), [S1], or S1 with actual citation labels.
    const markerMap = new Map(
      labelled.map((l) => [
        l.marker.toUpperCase(),
        this.getCitationLabel(l.match),
      ]),
    );
    body = body.replace(/[[(]?(S\d+)[\])]?/gi, (_, m: string) => {
      const label = markerMap.get(m.toUpperCase());
      return label ? `(${label})` : `(${m})`;
    });

    return { body, usedMatches };
  }
}
