import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, QuestionStatus } from '@prisma/client';
import { AnswerBankService } from '../answers/answer-bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from '../safety/safety.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly answerBankService: AnswerBankService,
    private readonly safetyService: SafetyService,
  ) {}

  async create(dto: CreateQuestionDto) {
    const userId = dto.userId?.trim();
    const text = dto.text?.trim();

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!text) {
      throw new BadRequestException('text is required');
    }

    const classification = await this.safetyService.classifyQuestion(text);
    const status = classification.isSensitive
      ? QuestionStatus.ROUTED_TO_USTADZ
      : QuestionStatus.RECEIVED;
    const verifiedMatch = classification.isSensitive
      ? null
      : await this.answerBankService.findVerifiedMatch(text);

    const question = await this.prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: {
          userId,
          text,
          language: dto.language ?? 'id',
          topic: classification.topic,
          isSensitive: classification.isSensitive,
          preferredUstadzId: dto.preferredUstadzId?.trim(),
          status,
        },
      });

      if (classification.isSensitive) {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: AuditAction.QUESTION_CLASSIFIED,
            entity: 'Question',
            entityId: createdQuestion.id,
            metadata: {
              isSensitive: true,
              topic: classification.topic,
            },
          },
        });
      }

      return createdQuestion;
    });

    return {
      question,
      verifiedMatch,
      route: classification.isSensitive ? 'ustadz_review' : 'answer_pipeline',
      answer: null,
    };
  }

  listForUser(userId: string) {
    return this.prisma.question.findMany({
      where: { userId: userId.trim() },
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
