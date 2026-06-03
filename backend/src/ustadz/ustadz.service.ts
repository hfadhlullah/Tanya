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
  ReviewAction,
  SensitiveRuleScope,
  SourceType,
  UserRole,
  UstadzStatus,
} from '@prisma/client';
import { PERSONAL_PATTERN } from '../answers/sourced-answer.service';
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
          : { status: QuestionStatus.ANSWERED_SOURCE };

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

      const editedBody = dto.body?.trim() || null;
      const note = dto.note?.trim() || null;

      // Derive the review action: explicit > inferred from an edit.
      const action: ReviewAction =
        dto.action ?? (editedBody ? ReviewAction.EDIT : ReviewAction.APPROVE);

      const isVerified =
        action === ReviewAction.APPROVE || action === ReviewAction.EDIT;

      const newStatus: AnswerStatus =
        action === ReviewAction.APPROVE
          ? AnswerStatus.VERIFIED
          : action === ReviewAction.EDIT
            ? AnswerStatus.USTADZ_EDITED
            : action === ReviewAction.REJECT
              ? AnswerStatus.USTADZ_REJECTED
              : AnswerStatus.NEEDS_REVISION;

      // The trusted final text: ustadz edit if present, otherwise the AI answer.
      const finalBody =
        action === ReviewAction.EDIT && editedBody ? editedBody : answer.body;

      const verifiedAnswer = await tx.answer.update({
        where: { id: answerId },
        data: {
          status: newStatus,
          // Surface the edited text as the displayed answer; the original AI
          // body is preserved in the AnswerReview snapshot below.
          ...(action === ReviewAction.EDIT && editedBody
            ? { body: editedBody }
            : {}),
          ...(isVerified
            ? { verifyingUstadzId: profile.id, verifiedAt: new Date() }
            : {}),
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

      // Structured review record: original AI answer, ustadz edit, and feedback.
      await tx.answerReview.create({
        data: {
          answerId,
          ustadzId: profile.id,
          action,
          aiBody: answer.body,
          editedBody,
          note,
        },
      });

      await tx.question.update({
        where: { id: answer.questionId },
        data: {
          status: isVerified
            ? QuestionStatus.ANSWERED_VERIFIED
            : QuestionStatus.ANSWERED_SOURCE,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: editedBody
            ? AuditAction.ANSWER_EDITED
            : AuditAction.ANSWER_APPROVED,
          entity: 'Answer',
          entityId: answerId,
          metadata: {
            verifyingUstadzId: profile.id,
            questionText: answer.question.text,
            reviewAction: action,
            note,
            reviewedBody: finalBody,
          },
        },
      });

      // Learning loop: feed verified answers back into the reusable corpus so
      // the app gets smarter as more ustadz review. Only for approve/edit, and
      // only for general (non-sensitive, non-personal) questions.
      const isReusable =
        isVerified &&
        finalBody.length >= 20 &&
        !answer.question.isSensitive &&
        !PERSONAL_PATTERN.test(answer.question.text.toLowerCase());

      if (isReusable) {
        let source = await tx.source.findFirst({
          where: { type: SourceType.VERIFIED_ANSWER, reference: profile.id },
        });

        if (!source) {
          source = await tx.source.create({
            data: {
              type: SourceType.VERIFIED_ANSWER,
              title: `Jawaban terverifikasi · Ustadz ${profile.publicName}`,
              reference: profile.id,
              language: answer.language ?? 'id',
            },
          });
        }

        const chunk = await tx.corpusChunk.create({
          data: {
            sourceId: source.id,
            content: finalBody,
            topic: answer.question.text.slice(0, 200),
            metadata: {
              answerId,
              questionId: answer.questionId,
              verifyingUstadzId: profile.id,
              verifiedAt: new Date().toISOString(),
              reviewAction: action,
              citationLabel: `Ustadz ${profile.publicName}`,
            },
          },
        });

        await this.jobs.enqueueCorpusEmbedding(chunk.id, tx);
      }

      return { ...verifiedAnswer, verified: isVerified };
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
