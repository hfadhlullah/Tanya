import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, AnswerStatus, QuestionStatus } from '@prisma/client';
import { LlmClientService } from '../answers/llm-client.service';
import { SourcedAnswerService } from '../answers/sourced-answer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { CreateQuestionDto } from './dto/create-question.dto';

const SENSITIVE_QUESTION_REFUSAL =
  'Maaf, pertanyaan ini tidak dapat kami jawab karena termasuk topik yang dilarang atau berisiko. Silakan ajukan pertanyaan seputar ibadah, akhlak, atau ilmu Islam yang aman dan bermanfaat.';

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

    const userPrefs = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredUstadzIds: true },
    });

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

    let answer = immediateAnswer;
    if (!classification.isSensitive) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      answer = isConversational
        ? await this.sourcedAnswerService.createConversationalAnswer(
            question,
            this.prisma,
          )
        : await this.sourcedAnswerService.createTierOneAnswer(
            question,
            this.prisma,
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

    const conversationalPhrases = new Set([
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
    ]);

    if (conversationalPhrases.has(normalized)) {
      return true;
    }

    const tokens = normalized.split(' ');
    if (tokens.length > 4) {
      return false;
    }

    const smallTalkWords = new Set([
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
    ]);

    if (tokens.every((token) => smallTalkWords.has(token))) {
      return true;
    }

    try {
      const response = await this.llm.complete([
        {
          role: 'system',
          content:
            'Klasifikasikan pesan pengguna sebagai salah satu dari dua label: CHAT atau RAG. ' +
            'CHAT untuk sapaan, basa-basi, ucapan terima kasih, salam, atau percakapan santai yang tidak butuh rujukan Islam khusus. ' +
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
