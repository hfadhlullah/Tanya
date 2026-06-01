import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, AnswerStatus, QuestionStatus } from '@prisma/client';
import { AnswerBankService, type AnswerBankMatch } from '../answers/answer-bank.service';
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
    private readonly answerBankService: AnswerBankService,
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

    const verifiedMatch: AnswerBankMatch | null = classification.isSensitive
      ? null
      : await this.answerBankService.findVerifiedMatch(text);

    const questionStatus = classification.isSensitive
      ? QuestionStatus.ANSWERED_VERIFIED
      : verifiedMatch
        ? QuestionStatus.ANSWERED_VERIFIED
        : QuestionStatus.RECEIVED;

    // Create question (and verified answer if available) in a short tx
    const { answer: immediateAnswer, question } = await this.prisma.$transaction(async (tx) => {
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
              select: { id: true, publicName: true, bio: true, specialties: true, madhhab: true },
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

      if (verifiedMatch) {
        const reusedAnswer = await tx.answer.create({
          data: {
            questionId: createdQuestion.id,
            body: verifiedMatch.body,
            status: AnswerStatus.VERIFIED,
            language: verifiedMatch.language,
            verifyingUstadzId: verifiedMatch.verifyingUstadz?.id ?? null,
            verifiedAt: new Date(),
            citations: {
              create: verifiedMatch.citations.map((c) => ({
                sourceId: c.sourceId,
                label: c.label,
                excerpt: c.excerpt,
              })),
            },
          },
          include: {
            citations: { include: { source: true } },
            verifyingUstadz: {
              select: { id: true, publicName: true, bio: true, specialties: true, madhhab: true },
            },
          },
        });
        return {
          answer: { ...reusedAnswer, verified: true, reusedFromAnswerId: verifiedMatch.answerId },
          question: createdQuestion,
        };
      }

      return { answer: null, question: createdQuestion };
    });

    // LLM answer generation happens outside the transaction (no timeout risk)
    let answer = immediateAnswer;
    if (!classification.isSensitive && !verifiedMatch) {
      answer = await this.sourcedAnswerService.createTierOneAnswer(question, this.prisma);
    }

    return {
      question,
      route: classification.isSensitive
        ? 'ustadz_review'
        : verifiedMatch
          ? 'verified_answer_bank'
          : 'answer_pipeline',
      answer,
    };
  }

  deleteSession(userId: string, sessionId: string) {
    return this.prisma.question.updateMany({
      where: { userId: userId.trim(), sessionId: sessionId.trim(), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  listForUser(userId: string) {
    return this.prisma.question.findMany({
      where: { userId: userId.trim(), deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: {
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
