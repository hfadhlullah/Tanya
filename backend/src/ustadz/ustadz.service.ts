import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnswerStatus, AuditAction, QuestionStatus, SensitiveRuleScope, UserRole, UstadzStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OnboardUstadzDto } from './dto/onboard-ustadz.dto';
import { VerifyAnswerDto } from './dto/verify-answer.dto';

@Injectable()
export class UstadzService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async onboard(userId: string, dto: OnboardUstadzDto) {
    const cleanUserId = userId.trim();

    if (!cleanUserId) {
      throw new BadRequestException('userId is required');
    }

    const profile = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: cleanUserId },
        data: { role: UserRole.USTADZ },
      });

      const ustadz = await tx.ustadzProfile.upsert({
        where: { userId: cleanUserId },
        update: {
          publicName: dto.publicName.trim(),
          bio: dto.bio?.trim(),
          credentials: dto.credentials?.trim(),
          publicProfile: dto.publicProfile?.trim(),
          specialties: dto.specialties.map((specialty) => specialty.trim()).filter(Boolean),
          madhhab: dto.madhhab?.trim(),
          status: UstadzStatus.PENDING,
        },
        create: {
          userId: cleanUserId,
          publicName: dto.publicName.trim(),
          bio: dto.bio?.trim(),
          credentials: dto.credentials?.trim(),
          publicProfile: dto.publicProfile?.trim(),
          specialties: dto.specialties.map((specialty) => specialty.trim()).filter(Boolean),
          madhhab: dto.madhhab?.trim(),
          status: UstadzStatus.PENDING,
        },
      });

      if (dto.gatedTopics?.length) {
        await tx.sensitiveRule.deleteMany({
          where: { ustadzId: ustadz.id, scope: SensitiveRuleScope.USTADZ },
        });
        await tx.sensitiveRule.createMany({
          data: dto.gatedTopics.map((topic) => ({
            ustadzId: ustadz.id,
            scope: SensitiveRuleScope.USTADZ,
            topic: topic.trim(),
            pattern: topic.trim(),
          })),
        });
      }

      return ustadz;
    });

    return { profile, locked: true };
  }

  async getDashboard(userId: string) {
    const profile = await this.prisma.ustadzProfile.findUnique({
      where: { userId: userId.trim() },
      include: { sensitiveRules: true },
    });

    if (!profile) {
      throw new NotFoundException('Ustadz profile not found');
    }

    if (profile.status !== UstadzStatus.APPROVED) {
      throw new ForbiddenException('Ustadz account is pending approval');
    }

    return { profile, locked: false };
  }

  approve(profileId: string) {
    return this.prisma.ustadzProfile.update({
      where: { id: profileId },
      data: { status: UstadzStatus.APPROVED },
    });
  }

  reject(profileId: string) {
    return this.prisma.ustadzProfile.update({
      where: { id: profileId },
      data: { status: UstadzStatus.REJECTED },
    });
  }

  async getReviewQueue(userId: string) {
    const profile = await this.requireApprovedProfile(userId);

    return this.prisma.answer.findMany({
      where: {
        status: AnswerStatus.AI_PENDING,
        verifyingUstadzId: null,
        question: {
          OR: [{ isSensitive: true }, { status: QuestionStatus.ANSWERED_SOURCE }],
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        question: true,
        citations: { include: { source: true } },
      },
      take: 50,
    }).then((answers) => ({ profileId: profile.id, answers }));
  }

  async verifyAnswer(userId: string, answerId: string, dto: VerifyAnswerDto) {
    const profile = await this.requireApprovedProfile(userId);

    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.answer.findUnique({
        where: { id: answerId },
        include: { question: true },
      });

      if (!answer) {
        throw new NotFoundException('Answer not found');
      }

      if (answer.status !== AnswerStatus.AI_PENDING) {
        throw new BadRequestException('Answer is already verified');
      }

      const verifiedAnswer = await tx.answer.update({
        where: { id: answerId },
        data: {
          body: dto.body?.trim() ?? answer.body,
          status: AnswerStatus.VERIFIED,
          verifyingUstadzId: profile.id,
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
            },
          },
        },
      });

      await tx.question.update({
        where: { id: answer.questionId },
        data: { status: QuestionStatus.ANSWERED_VERIFIED },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: dto.body?.trim() ? AuditAction.ANSWER_EDITED : AuditAction.ANSWER_APPROVED,
          entity: 'Answer',
          entityId: answerId,
          metadata: { verifyingUstadzId: profile.id },
        },
      });

      return { ...verifiedAnswer, verified: true };
    });
  }

  async uploadCredential(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    label?: string,
  ) {
    const profile = await this.prisma.ustadzProfile.findUnique({
      where: { userId: userId.trim() },
    });

    if (!profile) {
      throw new NotFoundException('Ustadz profile not found');
    }

    const stored = await this.storage.store(file.buffer, file.originalname, file.mimetype);

    return this.prisma.credentialFile.create({
      data: {
        ustadzId: profile.id,
        fileUrl: stored.url,
        label: label?.trim() ?? file.originalname,
      },
    });
  }

  private async requireApprovedProfile(userId: string) {
    const profile = await this.prisma.ustadzProfile.findUnique({
      where: { userId: userId.trim() },
    });

    if (!profile) {
      throw new NotFoundException('Ustadz profile not found');
    }

    if (profile.status !== UstadzStatus.APPROVED) {
      throw new ForbiddenException('Ustadz account is pending approval');
    }

    return profile;
  }
}
