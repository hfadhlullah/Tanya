import { Injectable } from '@nestjs/common';
import { SensitiveRuleScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSensitiveRuleDto } from './dto/upsert-sensitive-rule.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
