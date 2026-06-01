import { ConflictException, Injectable } from '@nestjs/common';
import { SensitiveRuleScope, UserRole, UstadzStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUstadzDto } from './dto/create-ustadz.dto';
import { UpsertSensitiveRuleDto } from './dto/upsert-sensitive-rule.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createUstadz(dto: CreateUstadzDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.trim(),
          passwordHash,
          displayName: dto.publicName.trim(),
          role: UserRole.USTADZ,
        },
      });

      const profile = await tx.ustadzProfile.create({
        data: {
          userId: user.id,
          publicName: dto.publicName.trim(),
          status: UstadzStatus.PENDING,
        },
      });

      return { user: { id: user.id, email: user.email, role: user.role }, profile };
    });
  }

  async approveUstadzWithProfile(profileId: string, dto: { publicName?: string; bio?: string; credentials?: string; publicProfile?: string; specialties?: string[]; madhhab?: string }) {
    return this.prisma.ustadzProfile.update({
      where: { id: profileId },
      data: {
        ...(dto.publicName && { publicName: dto.publicName.trim() }),
        bio: dto.bio?.trim() ?? undefined,
        credentials: dto.credentials?.trim() ?? undefined,
        publicProfile: dto.publicProfile?.trim() ?? undefined,
        specialties: dto.specialties?.map((s) => s.trim()).filter(Boolean),
        madhhab: dto.madhhab?.trim() ?? undefined,
        status: UstadzStatus.APPROVED,
      },
      include: { user: true },
    });
  }

  deactivateUstadz(profileId: string) {
    return this.prisma.ustadzProfile.update({
      where: { id: profileId },
      data: { status: UstadzStatus.REJECTED },
    });
  }

  listUstadzApplications() {
    return this.prisma.ustadzProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true, sensitiveRules: true, credentialFiles: true },
    });
  }

  listCorpusSources() {
    return this.prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { corpusChunks: true, citations: true } } },
    });
  }

  listSensitiveRules() {
    return this.prisma.sensitiveRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { ustadz: true },
    });
  }

  createSensitiveRule(dto: UpsertSensitiveRuleDto) {
    return this.prisma.sensitiveRule.create({
      data: {
        scope: dto.scope ?? SensitiveRuleScope.GLOBAL,
        ustadzId: dto.ustadzId?.trim(),
        topic: dto.topic.trim(),
        pattern: dto.pattern?.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  updateSensitiveRule(ruleId: string, dto: UpsertSensitiveRuleDto) {
    return this.prisma.sensitiveRule.update({
      where: { id: ruleId },
      data: {
        scope: dto.scope,
        ustadzId: dto.ustadzId?.trim(),
        topic: dto.topic?.trim(),
        pattern: dto.pattern?.trim(),
        isActive: dto.isActive,
      },
    });
  }

  listAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { actor: true },
      take: 100,
    });
  }
}
