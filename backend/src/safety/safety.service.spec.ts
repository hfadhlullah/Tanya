import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SafetyService } from './safety.service';

describe('SafetyService', () => {
  let service: SafetyService;
  const prisma = {
    sensitiveRule: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SafetyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SafetyService);
  });

  it('classifies text from active database rules', async () => {
    prisma.sensitiveRule.findMany.mockResolvedValue([
      { topic: 'waris', pattern: 'waris|faraid' },
    ]);

    await expect(service.classifyQuestion('Tanya tentang faraid')).resolves.toEqual({
      isSensitive: true,
      topic: 'waris',
    });
  });

  it('falls back to built-in safety patterns', async () => {
    prisma.sensitiveRule.findMany.mockResolvedValue([]);

    await expect(service.classifyQuestion('Bagaimana pembagian waris?')).resolves.toEqual({
      isSensitive: true,
      topic: 'waris',
    });
  });

  it('returns non-sensitive for safe text', async () => {
    prisma.sensitiveRule.findMany.mockResolvedValue([]);

    await expect(service.classifyQuestion('Bagaimana cara wudhu?')).resolves.toEqual({
      isSensitive: false,
    });
  });

  it('ignores invalid database regex patterns', async () => {
    prisma.sensitiveRule.findMany.mockResolvedValue([
      { topic: 'invalid', pattern: '[' },
    ]);

    await expect(service.classifyQuestion('Bagaimana cara wudhu?')).resolves.toEqual({
      isSensitive: false,
    });
  });
});
