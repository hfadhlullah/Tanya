import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  const adminService = {
    listUstadzApplications: jest.fn(),
    listCorpusSources: jest.fn(),
    listSensitiveRules: jest.fn(),
    createSensitiveRule: jest.fn(),
    updateSensitiveRule: jest.fn(),
    listAuditLogs: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminService }],
    }).compile();

    controller = module.get(AdminController);
  });

  it('delegates admin reads', async () => {
    await controller.listUstadzApplications();
    await controller.listCorpusSources();
    await controller.listSensitiveRules();
    await controller.listAuditLogs();

    expect(adminService.listUstadzApplications).toHaveBeenCalled();
    expect(adminService.listCorpusSources).toHaveBeenCalled();
    expect(adminService.listSensitiveRules).toHaveBeenCalled();
    expect(adminService.listAuditLogs).toHaveBeenCalled();
  });

  it('delegates sensitive rule writes', async () => {
    const dto = { topic: 'waris' };

    await controller.createSensitiveRule(dto);
    await controller.updateSensitiveRule('rule-1', dto);

    expect(adminService.createSensitiveRule).toHaveBeenCalledWith(dto);
    expect(adminService.updateSensitiveRule).toHaveBeenCalledWith(
      'rule-1',
      dto,
    );
  });
});
