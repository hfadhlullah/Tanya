import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  const prisma = {
    ustadzProfile: { findMany: jest.fn() },
    source: { findMany: jest.fn() },
    sensitiveRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AdminService);
  });

  it('lists admin-managed resources', async () => {
    await service.listUstadzApplications();
    await service.listCorpusSources();
    await service.listSensitiveRules();
    await service.listAuditLogs();

    expect(prisma.ustadzProfile.findMany).toHaveBeenCalled();
    expect(prisma.source.findMany).toHaveBeenCalled();
    expect(prisma.sensitiveRule.findMany).toHaveBeenCalled();
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: { actor: true },
      take: 100,
    });
  });

  it('creates sensitive rules', async () => {
    await service.createSensitiveRule({ topic: ' waris ', pattern: ' waris ' });

    expect(prisma.sensitiveRule.create).toHaveBeenCalledWith({
      data: {
        scope: 'GLOBAL',
        ustadzId: undefined,
        topic: 'waris',
        pattern: 'waris',
        isActive: true,
      },
    });
  });

  it('updates sensitive rules', async () => {
    await service.updateSensitiveRule('rule-1', {
      topic: 'talak',
      isActive: false,
    });

    expect(prisma.sensitiveRule.update).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
      data: {
        scope: undefined,
        ustadzId: undefined,
        topic: 'talak',
        pattern: undefined,
        isActive: false,
      },
    });
  });
});
