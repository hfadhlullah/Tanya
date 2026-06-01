import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UstadzStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UstadzService } from './ustadz.service';

describe('UstadzService', () => {
  let service: UstadzService;
  const prisma = {
    user: { update: jest.fn() },
    ustadzProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sensitiveRule: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [UstadzService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UstadzService);
  });

  it('creates pending ustadz profile and locks dashboard', async () => {
    prisma.ustadzProfile.upsert.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    const result = await service.onboard('user-1', {
      publicName: ' Ust. Ahmad ',
      specialties: ['thaharah'],
      gatedTopics: ['waris'],
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'USTADZ' },
    });
    expect(prisma.ustadzProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ publicName: 'Ust. Ahmad', status: 'PENDING' }),
        update: expect.objectContaining({ publicName: 'Ust. Ahmad', status: 'PENDING' }),
      }),
    );
    expect(prisma.sensitiveRule.createMany).toHaveBeenCalled();
    expect(result.locked).toBe(true);
  });

  it('blocks dashboard while profile is pending', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.PENDING });

    await expect(service.getDashboard('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows dashboard when profile is approved', async () => {
    prisma.ustadzProfile.findUnique.mockResolvedValue({ id: 'ustadz-1', status: UstadzStatus.APPROVED });

    await expect(service.getDashboard('user-1')).resolves.toEqual({
      profile: { id: 'ustadz-1', status: UstadzStatus.APPROVED },
      locked: false,
    });
  });

  it('approves and rejects profiles', async () => {
    await service.approve('ustadz-1');
    await service.reject('ustadz-1');

    expect(prisma.ustadzProfile.update).toHaveBeenCalledWith({
      where: { id: 'ustadz-1' },
      data: { status: UstadzStatus.APPROVED },
    });
    expect(prisma.ustadzProfile.update).toHaveBeenCalledWith({
      where: { id: 'ustadz-1' },
      data: { status: UstadzStatus.REJECTED },
    });
  });
});
