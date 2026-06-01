import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { AdminService } from './admin.service';
import { UpsertSensitiveRuleDto } from './dto/upsert-sensitive-rule.dto';

@Controller('admin')
@UseGuards(DemoAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('ustadz-applications')
  listUstadzApplications() {
    return this.adminService.listUstadzApplications();
  }

  @Get('corpus-sources')
  listCorpusSources() {
    return this.adminService.listCorpusSources();
  }

  @Get('sensitive-rules')
  listSensitiveRules() {
    return this.adminService.listSensitiveRules();
  }

  @Post('sensitive-rules')
  createSensitiveRule(@Body() dto: UpsertSensitiveRuleDto) {
    return this.adminService.createSensitiveRule(dto);
  }

  @Patch('sensitive-rules/:ruleId')
  updateSensitiveRule(@Param('ruleId') ruleId: string, @Body() dto: UpsertSensitiveRuleDto) {
    return this.adminService.updateSensitiveRule(ruleId, dto);
  }

  @Get('audit-logs')
  listAuditLogs() {
    return this.adminService.listAuditLogs();
  }
}
