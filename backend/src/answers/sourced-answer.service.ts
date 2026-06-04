import { Injectable } from '@nestjs/common';
import { AnswerStatus, QuestionStatus } from '@prisma/client';
import {
  CorpusRetrievalService,
  type CorpusMatch,
  type CorpusTx,
} from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';

export type IslamicQuestionIntent =
  | 'CASUAL'
  | 'SIMPLE_HUKUM'
  | 'DALIL_REQUEST'
  | 'DEEP_HUKUM'
  | 'PERSONAL_ADVICE'
  | 'AMBIGUOUS';

// Matches first-person / emotional phrasing that signals a personal situation
// rather than a general ruling question. Reused by the learning-loop privacy
// guard so private answers do not leak into the reusable corpus.
export const PERSONAL_PATTERN =
  /\b(aku|saya|gimana caranya|bagaimana agar|bingung|takut|sedih|ingin berhenti|aku lagi|curhat)\b/;

type ConversationTurn = { text: string; answer: string };

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
    history: ConversationTurn[] = [],
    answerMode: 'fast' | 'thinking' = 'fast',
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

    const intent = this.classifyIntent(question.text);
    const { body, usedMatches } = await this.synthesizeAnswer(
      question.text,
      matches,
      intent,
      history,
      answerMode,
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
    return {
      ...answer,
      label,
      verified: false,
      corpusHits: usedMatches.length,
    };
  }

  async createConversationalAnswer(
    question: {
      id: string;
      text: string;
      language: string;
      preferredUstadzId?: string | null;
    },
    tx: AnswerTx,
    history: ConversationTurn[] = [],
  ) {
    let body: string;

    try {
      body = await this.llm.complete([
        {
          role: 'system',
          content:
            'You are an Islamic Q&A assistant. This user message is casual conversation, not a request for Quran, Hadith, or scholarly sourcing. ' +
            'Reply in warm, natural Indonesian like a thoughtful Muslim or Muslimah: friendly, calm, respectful, and full of adab, but not strict or preachy. ' +
            'Keep it short, conversational, and helpful. Do not mention missing sources, corpus retrieval, or ustadz review unless the user asks about Islamic guidance.' +
            (history.length > 0
              ? ' If the user references something from the conversation (e.g., pronouns like "itu", "tersebut"), resolve it using the conversation history.'
              : ''),
        },
        ...history.flatMap((t) => [
          { role: 'user' as const, content: t.text },
          { role: 'assistant' as const, content: t.answer },
        ]),
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
        status: AnswerStatus.VERIFIED,
        verifiedAt: new Date(),
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

  // Rule-based intent detection. CASUAL is normally handled upstream by the
  // conversational route, so this mainly distinguishes the RAG-path intents that
  // shape answer length and structure.
  classifyIntent(questionText: string): IslamicQuestionIntent {
    const q = questionText.toLowerCase().trim();

    if (/^(ass?alam|halo|hai|hi|hello)\b/.test(q)) {
      return 'CASUAL';
    }
    if (/\b(dalil|ayat|hadits|hadis|riwayat|sumber)\b/.test(q)) {
      return 'DALIL_REQUEST';
    }
    if (
      /\b(jelaskan|penjelasan|kenapa|mengapa|perbedaan pendapat|khilaf|ulama)\b/.test(
        q,
      )
    ) {
      return 'DEEP_HUKUM';
    }
    if (PERSONAL_PATTERN.test(q)) {
      return 'PERSONAL_ADVICE';
    }
    if (/\b(hukum|haram|halal|boleh|wajib|sunnah|makruh|mubah)\b/.test(q)) {
      return 'SIMPLE_HUKUM';
    }
    return 'AMBIGUOUS';
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
    intent: IslamicQuestionIntent = 'AMBIGUOUS',
    history: ConversationTurn[] = [],
    answerMode: 'fast' | 'thinking' = 'fast',
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
        type: 'VERIFIED_ANSWER',
        heading: 'JAWABAN_TERVERIFIKASI',
        rule: 'This is a previous answer already verified by an ustadz. Treat it as trusted. Use it if relevant to the question.',
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
    // Tune the caution wording to the detected intent.
    if (presentSections.length === 0) {
      const noCorpusByIntent: Record<IslamicQuestionIntent, string> = {
        CASUAL: 'Reply warmly in 1–2 sentences.',
        SIMPLE_HUKUM:
          'Give a careful, general answer. Avoid a strong ruling unless it is common and safe.',
        DALIL_REQUEST:
          'State that no specific dalil was retrieved from the corpus, then answer carefully in general terms.',
        DEEP_HUKUM:
          'Say the corpus does not have enough context for a deep discussion, then give a cautious general answer.',
        PERSONAL_ADVICE:
          'Be gentle and practical. Acknowledge the situation and suggest asking a qualified ustadz for the specific case.',
        AMBIGUOUS: 'Answer carefully and briefly. Do not invent details.',
      };
      const noCorpusInstruction =
        answerMode === 'thinking'
          ? 'Write a thorough, structured answer. Use these sections (include a section only if you have genuine general knowledge — do not fabricate verse numbers or hadith chains):\n' +
            "**Perspektif Al-Qur'an**: What the Quran generally teaches about this topic. At least 2–3 sentences.\n" +
            '**Perspektif Hadits**: Relevant well-known prophetic guidance on this topic. At least 2–3 sentences.\n' +
            '**Kesimpulan**: A practical summary answering the question in 2–3 sentences.\n' +
            'Start with one direct sentence. Provide depth — do not truncate.'
          : noCorpusByIntent[intent];

      try {
        const body = await this.llm.complete([
          {
            role: 'system',
            content:
              'You are an Islamic Q&A assistant. Speak like a thoughtful Muslim or ' +
              'Muslimah: warm, calm, respectful, and full of adab, but not strict or ' +
              'preachy. There is no retrieved corpus context for this question. ' +
              'Answer in Indonesian and do not invent Quran verses, Hadits, or ' +
              'ustadz opinions. ' +
              noCorpusInstruction +
              (history.length > 0
                ? ' If the user references something from the conversation (e.g., pronouns like "itu", "tersebut"), resolve it using the conversation history.'
                : ''),
          },
          ...history.flatMap((t) => [
            { role: 'user' as const, content: t.text },
            { role: 'assistant' as const, content: t.answer },
          ]),
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
            .map((l) => {
              const citationLabel = this.getCitationLabel(l.match);
              return `[${l.marker}] [Sumber: ${citationLabel}]\n${l.match.content.slice(0, 500)}`;
            })
            .join('\n\n'),
      )
      .join('\n\n');

    const historyBlock =
      history.length > 0
        ? 'Riwayat percakapan sebelumnya:\n' +
          history
            .map(
              (t, i) =>
                `[T${i + 1}] Pengguna: ${t.text}\nAssisten: ${t.answer}`,
            )
            .join('\n\n') +
          '\n\n---\n\n'
        : '';

    const userContent =
      historyBlock +
      `Pertanyaan:\n${questionText}\n\n` +
      `PENTING: Setiap potongan konteks memiliki label [Sumber: ...]. Gunakan HANYA referensi dari label tersebut saat menyebut ayat atau hadits. Jangan mengarang nomor ayat atau hadits lain.\n\n` +
      `Retrieved Context (setiap potongan diberi penanda seperti [S1]):\n\n` +
      contextBlocks;

    const hasUstadz = presentSections.some((s) => s.type === 'USTADZ_CONTENT');

    const intentRules: Record<IslamicQuestionIntent, string> = {
      CASUAL: 'Reply warmly in 1–2 sentences. Do not show source sections.',
      SIMPLE_HUKUM:
        'Answer in 2–4 short sentences. The first sentence must directly state the hukum/status (wajib, sunnah, mubah, makruh, haram, dianjurkan, tidak diperbolehkan, or ada perbedaan pendapat). Do not use separate Quran/Hadits/Ustadz sections. Mention dalil only briefly if directly available. Do not over-explain. If there is disagreement, mention it briefly.',
      DALIL_REQUEST:
        'Start with the ruling/status, then explain the relevant dalil/source briefly. Use Quran/Hadits/Ustadz content only if retrieved and relevant. Keep each dalil short and easy to understand.',
      DEEP_HUKUM:
        'Use structured sections with headings: Jawaban singkat, Penjelasan, Dalil, Catatan / perbedaan pendapat (if relevant), Kesimpulan.',
      PERSONAL_ADVICE:
        'Acknowledge the situation gently. Give Islamic guidance without judging. Give realistic next steps. Avoid harsh wording unless the source clearly supports it. Do not overclaim.',
      AMBIGUOUS:
        'Answer carefully and briefly. If needed, mention the assumption you used. Do not invent detail.',
    };

    const systemPrompt =
      'You are an Islamic Q&A assistant for Indonesian users. ' +
      'You answer using only the retrieved RAG context provided by the system. ' +
      'Speak like a thoughtful Muslim or Muslimah: warm, calm, respectful, and full of adab, ' +
      'but not strict, preachy, or judgmental.\n\n' +
      'Core rule:\n' +
      "Always answer the user's main question in the first sentence. " +
      'For hukum/status questions, the first sentence must directly state the ruling/status. ' +
      'Never start with source explanation.\n\n' +
      (history.length > 0
        ? 'Conversation context:\n' +
          'The user message may contain pronouns (itu, tersebut, hal itu, topik itu, dll.) or references to the previous conversation. ' +
          'Resolve them using the conversation history in the user message before searching the retrieved context.\n\n'
        : '') +
      `Detected user intent: ${intent}\n` +
      `Output rule for this intent:\n${
        answerMode === 'thinking'
          ? 'Write a thorough, structured answer using ALL relevant retrieved context. Use these sections:\n' +
            "**Perspektif Al-Qur'an**: Explain in detail what the Quran says. Quote and explain the relevant verses from the retrieved context. At least 2–3 sentences.\n" +
            '**Perspektif Hadits**: Explain in detail what the Hadith says. Reference the retrieved hadith context fully. At least 2–3 sentences.\n' +
            (hasUstadz
              ? '**Perspektif Ustadz**: Explain the ustadz perspective in detail if directly relevant. At least 2 sentences.\n'
              : '') +
            '**Kesimpulan**: Summarize the practical takeaway clearly in 2–3 sentences.\n' +
            'Do not skip sections that have retrieved context. Start with one direct sentence before the sections.'
          : intentRules[intent]
      }\n\n` +
      'Tone & style:\n' +
      '- Answer in Indonesian.\n' +
      '- Clear, calm, natural, and narrative — like a kind Muslim friend who menjaga adab.\n' +
      "- Add light bold (**word**) to a few key terms to emphasize important points. Don't overdo it.\n" +
      '- Avoid sounding robotic, overly academic, harsh, scolding, or like you are lecturing.\n\n' +
      'Source handling:\n' +
      '- Use only relevant retrieved chunks; ignore unrelated ones.\n' +
      '- Do not invent information outside the provided context.\n' +
      '- Do not give a legal ruling stronger than the retrieved context supports.\n' +
      '- CRITICAL: When mentioning Quran verses or Hadith, you MUST only use the exact reference shown in [Sumber: ...] of each retrieved chunk. Do NOT add, invent, or fill in verse numbers from your training knowledge. If a chunk has no [Sumber] label, refer to the topic only — never fabricate a verse number or hadith chain.\n' +
      '- IMPORTANT: Never fabricate ustadz opinions. Only refer to ustadz content if the Ustadz context directly addresses the question.\n' +
      (hasUstadz
        ? ''
        : '- Do NOT mention or invent any ustadz opinion; no Ustadz context was provided.\n') +
      '- Do NOT say "berdasarkan konteks yang tersedia" when the sources clearly answer the question. Use uncertainty wording only when the sources are incomplete, weak, conflicting, or only partially relevant.\n\n' +
      (answerMode === 'thinking'
        ? 'Length:\n- Provide a comprehensive, detailed answer. Fully develop each section — do not truncate. Depth matters more than brevity.\n\n'
        : "Length:\n- Match the user's question. Short question = short answer. Detailed question = detailed answer. Do not over-answer.\n\n") +
      'Return strict JSON only, no markdown wrapper, in exactly this shape:\n' +
      '{"answer": "...", "usedSources": ["S1", "S2"], "intent": "' +
      intent +
      '"}\n' +
      'In "usedSources", list only the markers (e.g. S1, S3) whose context you genuinely relied on. If you used none, return an empty array. The "answer" value is the user-facing text and must not contain the markers.';

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

    return this.parseSynthesizedAnswer(raw, labelled);
  }

  // Prefer strict JSON output. Fall back to the legacy SUMBER: parser if the
  // model did not return parseable JSON.
  private parseSynthesizedAnswer(
    raw: string,
    labelled: Array<{ marker: string; match: CorpusMatch }>,
  ): { body: string; usedMatches: CorpusMatch[] } {
    // Tolerate a ```json ... ``` wrapper if the model adds one.
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        answer?: unknown;
        usedSources?: unknown;
      };

      if (
        typeof parsed.answer === 'string' &&
        Array.isArray(parsed.usedSources)
      ) {
        const usedMarkers = new Set(
          parsed.usedSources
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.toUpperCase()),
        );

        return {
          body: parsed.answer.trim(),
          usedMatches: labelled
            .filter((l) => usedMarkers.has(l.marker.toUpperCase()))
            .map((l) => l.match),
        };
      }
    } catch {
      // fall through to legacy parser
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
