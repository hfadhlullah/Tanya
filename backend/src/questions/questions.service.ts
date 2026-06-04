import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, AnswerStatus, QuestionStatus } from '@prisma/client';
import { LlmClientService } from '../answers/llm-client.service';
import { SourcedAnswerService } from '../answers/sourced-answer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { CreateQuestionDto } from './dto/create-question.dto';

const SENSITIVE_QUESTION_REFUSAL =
  'Maaf, pertanyaan ini tidak dapat kami jawab karena termasuk topik yang dilarang atau berisiko. Silakan ajukan pertanyaan seputar ibadah, akhlak, atau ilmu Islam yang aman dan bermanfaat.';

const CONVERSATIONAL_PHRASES = new Set([
  'hi',
  'hai',
  'halo',
  'hello',
  'assalamualaikum',
  'asalamualaikum',
  'assalamu alaikum',
  'assalamu alaikum warahmatullahi wabarakatuh',
  'assalamualaikum warahmatullahi wabarakatuh',
  'salam',
  'p',
  'ping',
  'yo',
  'hey',
  'whats up',
  'whatsup',
  'apa kabar',
  'gimana kabarnya',
  'lagi ngapain',
  'terima kasih',
  'makasih',
  'makasi',
  'thanks',
  'sip',
  'oke',
  'ok',
  'tes',
  'test',
  'testing',
  'hi bestie',
]);

const SMALL_TALK_WORDS = new Set([
  'hi',
  'hai',
  'halo',
  'hello',
  'assalamualaikum',
  'asalamualaikum',
  'salam',
  'hey',
  'yo',
  'whats',
  'up',
  'whatsup',
  'apa',
  'kabar',
  'gimana',
  'kabarnya',
  'lagi',
  'ngapain',
  'makasih',
  'makasi',
  'thanks',
  'terima',
  'kasih',
  'oke',
  'ok',
  'sip',
  'bro',
  'sis',
  'bestie',
  'tes',
  'test',
  'testing',
  'cek',
  'check',
  'uy',
]);

const ISLAMIC_QUESTION_SIGNAL =
  /\b(apa|bagaimana|kenapa|mengapa|bolehkah|bisakah|hukum|haram|halal|wajib|sunnah|makruh|mubah|dalil|ayat|hadits|hadis|doa|shalat|salat|zakat|puasa|haji|umrah|nikah|waris|riba|aurat|najis|wudhu)\b/u;

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClientService,
    private readonly sourcedAnswerService: SourcedAnswerService,
    private readonly safetyService: SafetyService,
  ) {}

  async create(currentUserId: string, dto: CreateQuestionDto) {
    const userId = currentUserId?.trim();
    const text = dto.text?.trim();

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!text) {
      throw new BadRequestException('text is required');
    }

    const classification = await this.safetyService.classifyQuestion(text);
    const isConversational = classification.isSensitive
      ? false
      : dto.intentHint === 'conversation'
        ? true
        : await this.isConversationalMessage(text);

    const questionStatus = classification.isSensitive
      ? QuestionStatus.ANSWERED_VERIFIED
      : QuestionStatus.RECEIVED;

    // Create question (and verified answer if available) in a short tx
    const { answer: immediateAnswer, question } =
      await this.prisma.$transaction(async (tx) => {
        const createdQuestion = await tx.question.create({
          data: {
            userId,
            text,
            language: dto.language ?? 'id',
            topic: classification.topic,
            isSensitive: classification.isSensitive,
            preferredUstadzId: dto.preferredUstadzId?.trim(),
            sessionId: dto.sessionId?.trim() ?? null,
            status: questionStatus,
          },
        });

        if (classification.isSensitive) {
          const blockedAnswer = await tx.answer.create({
            data: {
              questionId: createdQuestion.id,
              body: SENSITIVE_QUESTION_REFUSAL,
              status: AnswerStatus.VERIFIED,
              language: dto.language ?? 'id',
              isSensitive: true,
              verifiedAt: new Date(),
            },
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
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: AuditAction.QUESTION_CLASSIFIED,
              entity: 'Question',
              entityId: createdQuestion.id,
              metadata: { isSensitive: true, topic: classification.topic },
            },
          });
          return {
            answer: {
              ...blockedAnswer,
              label: 'Pertanyaan sensitif · tidak dapat dijawab',
              verified: true,
            },
            question: createdQuestion,
          };
        }

        return { answer: null, question: createdQuestion };
      });

    // LLM answer generation happens outside the transaction (no timeout risk)

    const sessionHistory = dto.sessionId
      ? await this.prisma.question.findMany({
          where: {
            userId,
            sessionId: dto.sessionId.trim(),
            id: { not: question.id },
            deletedAt: null,
            answers: { some: {} },
          },
          orderBy: { createdAt: 'asc' },
          take: 5,
          include: {
            answers: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { body: true },
            },
          },
        })
      : [];

    const conversationHistory = sessionHistory.map((q) => ({
      text: q.text,
      answer: q.answers[0]?.body ?? '',
    }));

    let answer = immediateAnswer;
    if (!classification.isSensitive) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      answer = isConversational
        ? await this.sourcedAnswerService.createConversationalAnswer(
            question,
            this.prisma,
            conversationHistory,
          )
        : await this.sourcedAnswerService.createTierOneAnswer(
            question,
            this.prisma,
            conversationHistory,
            dto.answerMode ?? 'fast',
          );
    }

    return {
      question,
      route: classification.isSensitive
        ? 'ustadz_review'
        : isConversational
          ? 'conversation'
          : 'answer_pipeline',
      answer,
    };
  }

  private async isConversationalMessage(text: string) {
    const normalized = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return false;
    }

    if (CONVERSATIONAL_PHRASES.has(normalized)) {
      return true;
    }

    if (
      normalized.length <= 20 &&
      !text.includes('?') &&
      !ISLAMIC_QUESTION_SIGNAL.test(normalized)
    ) {
      return true;
    }

    const tokens = normalized.split(' ');
    if (tokens.length > 4) {
      return false;
    }

    if (tokens.every((token) => SMALL_TALK_WORDS.has(token))) {
      return true;
    }

    try {
      const response = await this.llm.complete([
        {
          role: 'system',
          content:
            'Klasifikasikan pesan pengguna sebagai salah satu dari dua label: CHAT atau RAG. ' +
            'CHAT untuk: sapaan, basa-basi, ucapan terima kasih, salam, percakapan santai yang tidak butuh rujukan Islam khusus, ' +
            'atau permintaan untuk mempersingkat/meringkas jawaban sebelumnya (seperti "lebih singkat", "singkat aja", "persingkat", "ringkas", "in short", "tl;dr"). ' +
            'RAG untuk pertanyaan yang meminta penjelasan, hukum, dalil, panduan, nasihat Islam, atau topik yang sebaiknya dicek ke Al-Quran, Hadits, atau corpus ustadz. ' +
            'Jawab hanya dengan satu kata: CHAT atau RAG.',
        },
        { role: 'user', content: text },
      ]);

      return response.trim().toUpperCase().startsWith('CHAT');
    } catch {
      return false;
    }
  }

  deleteSession(userId: string, sessionId: string) {
    return this.prisma.question.updateMany({
      where: {
        userId: userId.trim(),
        sessionId: sessionId.trim(),
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }

  listForUser(userId: string) {
    return this.prisma.question.findMany({
      where: { userId: userId.trim(), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: {
          orderBy: { createdAt: 'desc' },
          include: {
            citations: { include: { source: true } },
            verifyingUstadz: {
              select: {
                id: true,
                publicName: true,
                bio: true,
                specialties: true,
                madhhab: true,
              },
            },
          },
        },
      },
    });
  }
}
