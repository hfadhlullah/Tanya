import { Test, TestingModule } from '@nestjs/testing';
import { UstadzController } from './ustadz.controller';
import { UstadzService } from './ustadz.service';

describe('UstadzController', () => {
  let controller: UstadzController;
  const ustadzService = {
    onboard: jest.fn(),
    getDashboard: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UstadzController],
      providers: [{ provide: UstadzService, useValue: ustadzService }],
    }).compile();

    controller = module.get(UstadzController);
  });

  it('onboards current user as ustadz', async () => {
    const dto = { publicName: 'Ust. Ahmad', specialties: ['thaharah'] };

    await controller.onboard({ id: 'user-1' }, dto);

    expect(ustadzService.onboard).toHaveBeenCalledWith('user-1', dto);
  });

  it('loads current ustadz dashboard', async () => {
    await controller.getDashboard({ id: 'user-1' });

    expect(ustadzService.getDashboard).toHaveBeenCalledWith('user-1');
  });
});
