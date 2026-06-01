import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { AdminService } from './admin.service';
import { CreateUstadzDto } from './dto/create-ustadz.dto';
import { UpsertSensitiveRuleDto } from './dto/upsert-sensitive-rule.dto';

class ApproveUstadzDto {
  @IsOptional() @IsString() @MaxLength(160) publicName?: string;
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @IsOptional() @IsString() @MaxLength(1000) credentials?: string;
  @IsOptional() @IsString() @MaxLength(240) publicProfile?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsString() @MaxLength(80) madhhab?: string;
}

@Controller('admin')
@UseGuards(DemoAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('ustadz')
  createUstadz(@Body() dto: CreateUstadzDto) {
    return this.adminService.createUstadz(dto);
  }

  @Patch('ustadz/:profileId/approve')
  approveUstadzWithProfile(@Param('profileId') profileId: string, @Body() dto: ApproveUstadzDto) {
    return this.adminService.approveUstadzWithProfile(profileId, dto);
  }

  @Patch('ustadz/:profileId/deactivate')
  deactivateUstadz(@Param('profileId') profileId: string) {
    return this.adminService.deactivateUstadz(profileId);
  }

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
