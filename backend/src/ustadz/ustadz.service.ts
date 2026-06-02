import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerStatus,
  AuditAction,
  QuestionStatus,
  SensitiveRuleScope,
  UserRole,
  UstadzStatus,
} from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OnboardUstadzDto } from './dto/onboard-ustadz.dto';
import { VerifyAnswerDto } from './dto/verify-answer.dto';

@Injectable()
export class UstadzService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
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
          specialties: dto.specialties
            .map((specialty) => specialty.trim())
            .filter(Boolean),
          madhhab: dto.madhhab?.trim(),
          status: UstadzStatus.PENDING,
        },
        create: {
          userId: cleanUserId,
          publicName: dto.publicName.trim(),
          bio: dto.bio?.trim(),
          credentials: dto.credentials?.trim(),
          publicProfile: dto.publicProfile?.trim(),
          specialties: dto.specialties
            .map((specialty) => specialty.trim())
            .filter(Boolean),
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

  listPublicUstadz() {
    return this.prisma.ustadzProfile.findMany({
      where: { status: UstadzStatus.APPROVED },
      select: {
        id: true,
        publicName: true,
        specialties: true,
        madhhab: true,
        bio: true,
      },
      orderBy: { publicName: 'asc' },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.ustadzProfile.findUnique({
      where: { userId: userId.trim() },
      include: { sensitiveRules: true, credentialFiles: true },
    });
  }

  async updateProfile(userId: string, dto: OnboardUstadzDto) {
    const cleanUserId = userId.trim();

    const profile = await this.prisma.$transaction(async (tx) => {
      const ustadz = await tx.ustadzProfile.upsert({
        where: { userId: cleanUserId },
        update: {
          publicName: dto.publicName.trim(),
          bio: dto.bio?.trim(),
          credentials: dto.credentials?.trim(),
          publicProfile: dto.publicProfile?.trim(),
          specialties: dto.specialties.map((s) => s.trim()).filter(Boolean),
          madhhab: dto.madhhab?.trim(),
          status: UstadzStatus.APPROVED,
        },
        create: {
          userId: cleanUserId,
          publicName: dto.publicName.trim(),
          bio: dto.bio?.trim(),
          credentials: dto.credentials?.trim(),
          publicProfile: dto.publicProfile?.trim(),
          specialties: dto.specialties.map((s) => s.trim()).filter(Boolean),
          madhhab: dto.madhhab?.trim(),
          status: UstadzStatus.APPROVED,
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

    return { profile };
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

    const [totalVerified, verifiedToday, queueCount] = await Promise.all([
      this.prisma.answer.count({
        where: { verifyingUstadzId: profile.id, status: AnswerStatus.VERIFIED },
      }),
      this.prisma.answer.count({
        where: {
          verifyingUstadzId: profile.id,
          status: AnswerStatus.VERIFIED,
          verifiedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.answer.count({
        where: { status: AnswerStatus.AI_PENDING, verifyingUstadzId: null },
      }),
    ]);

    return {
      profile,
      locked: false,
      stats: { totalVerified, verifiedToday, queueCount },
    };
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

  async getReviewQueue(
    userId: string,
    filters?: { date?: string; type?: string },
  ) {
    const profile = await this.requireApprovedProfile(userId);

    const questionFilter =
      filters?.type === 'sensitive'
        ? { isSensitive: true, status: QuestionStatus.ANSWERED_SOURCE }
        : filters?.type === 'non-sensitive'
          ? { isSensitive: false, status: QuestionStatus.ANSWERED_SOURCE }
          : {
              OR: [
                { isSensitive: true },
                { status: QuestionStatus.ANSWERED_SOURCE },
              ],
            };

    const dateFilter =
      filters?.date === 'today'
        ? {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          }
        : {};

    return this.prisma.answer
      .findMany({
        where: {
          status: AnswerStatus.AI_PENDING,
          verifyingUstadzId: null,
          ...dateFilter,
          question: questionFilter,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          question: true,
          citations: { include: { source: true } },
        },
        take: 50,
      })
      .then((answers) => ({ profileId: profile.id, answers }));
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
          action: dto.body?.trim()
            ? AuditAction.ANSWER_EDITED
            : AuditAction.ANSWER_APPROVED,
          entity: 'Answer',
          entityId: answerId,
          metadata: {
            verifyingUstadzId: profile.id,
            questionText: answer.question.text,
            reviewedBody: dto.body?.trim() || verifiedAnswer.body,
          },
        },
      });

      if (dto.body?.trim() && dto.body.trim().length >= 20) {
        const sourceTitle = `Ustadz ${profile.publicName}`;
        let source = await tx.source.findFirst({
          where: { type: 'USTADZ_CONTENT', reference: profile.id },
        });

        if (!source) {
          source = await tx.source.create({
            data: {
              type: 'USTADZ_CONTENT',
              title: sourceTitle,
              reference: profile.id,
              language: answer.language ?? 'id',
            },
          });
        }

        const chunk = await tx.corpusChunk.create({
          data: {
            sourceId: source.id,
            content: dto.body!.trim(),
            topic: answer.question.text.slice(0, 200),
            metadata: {
              answerId,
              questionId: answer.questionId,
              verifyingUstadzId: profile.id,
              verifiedAt: new Date().toISOString(),
              citationLabel: `Ustadz ${profile.publicName}`,
            },
          },
        });

        await this.jobs.enqueueCorpusEmbedding(chunk.id, tx);
      }

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

    const stored = this.storage.store(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    return this.prisma.credentialFile.create({
      data: {
        ustadzId: profile.id,
        fileUrl: stored.url,
        label: label?.trim() ?? file.originalname,
      },
    });
  }

  async flagAnswer(userId: string, answerId: string) {
    const profile = await this.requireApprovedProfile(userId);

    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.status !== AnswerStatus.AI_PENDING)
      throw new BadRequestException('Answer already processed');

    // Claim the answer so it disappears from queue, but keep AI_PENDING status as "flagged"
    return this.prisma.answer.update({
      where: { id: answerId },
      data: { verifyingUstadzId: profile.id },
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
