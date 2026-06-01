import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SensitiveRuleScope, UserRole, UstadzStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardUstadzDto } from './dto/onboard-ustadz.dto';

@Injectable()
export class UstadzService {
  constructor(private readonly prisma: PrismaService) {}

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
}
