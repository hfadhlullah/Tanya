import { ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, SensitiveRuleScope, UserRole, UstadzStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUstadzDto } from './dto/create-ustadz.dto';
import { UpsertSensitiveRuleDto } from './dto/upsert-sensitive-rule.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async createUstadz(dto: CreateUstadzDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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

      return {
        user: { id: user.id, email: user.email, role: user.role },
        profile,
      };
    });
  }

  async approveUstadzWithProfile(
    profileId: string,
    dto: {
      publicName?: string;
      bio?: string;
      credentials?: string;
      publicProfile?: string;
      specialties?: string[];
      madhhab?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.ustadzProfile.update({
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
      await tx.auditLog.create({
        data: {
          action: AuditAction.USTADZ_APPROVED,
          entity: 'UstadzProfile',
          entityId: profileId,
          metadata: { publicName: profile.publicName },
        },
      });
      return profile;
    });
  }

  async deactivateUstadz(profileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.ustadzProfile.update({
        where: { id: profileId },
        data: { status: UstadzStatus.REJECTED },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.USTADZ_REJECTED,
          entity: 'UstadzProfile',
          entityId: profileId,
          metadata: { publicName: profile.publicName },
        },
      });
      return profile;
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

  async createSensitiveRule(dto: UpsertSensitiveRuleDto) {
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.sensitiveRule.create({
        data: {
          scope: dto.scope ?? SensitiveRuleScope.GLOBAL,
          ustadzId: dto.ustadzId?.trim(),
          topic: dto.topic.trim(),
          pattern: dto.pattern?.trim(),
          isActive: dto.isActive ?? true,
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.SENSITIVE_RULE_CHANGED,
          entity: 'SensitiveRule',
          entityId: rule.id,
          metadata: { change: 'created', topic: rule.topic, scope: rule.scope },
        },
      });
      return rule;
    });
  }

  async updateSensitiveRule(ruleId: string, dto: UpsertSensitiveRuleDto) {
    return this.prisma.$transaction(async (tx) => {
      const rule = await tx.sensitiveRule.update({
        where: { id: ruleId },
        data: {
          scope: dto.scope,
          ustadzId: dto.ustadzId?.trim(),
          topic: dto.topic?.trim(),
          pattern: dto.pattern?.trim(),
          isActive: dto.isActive,
        },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.SENSITIVE_RULE_CHANGED,
          entity: 'SensitiveRule',
          entityId: rule.id,
          metadata: { change: 'updated', topic: rule.topic, scope: rule.scope, isActive: rule.isActive },
        },
      });
      return rule;
    });
  }

  async listAuditLogs(query: {
    action?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) {
      where.action = query.action;
    }
    if (query.search?.trim()) {
      where.actor = { email: { contains: query.search.trim(), mode: 'insensitive' } };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { actor: true },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
