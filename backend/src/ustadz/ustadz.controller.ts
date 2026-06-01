import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type CurrentUser as CurrentUserType } from '../auth/current-user.decorator';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { OnboardUstadzDto } from './dto/onboard-ustadz.dto';
import { UstadzService } from './ustadz.service';

@Controller('ustadz')
export class UstadzController {
  constructor(private readonly ustadzService: UstadzService) {}

  @Post('onboarding')
  @UseGuards(DemoAuthGuard)
  onboard(@CurrentUser() user: CurrentUserType, @Body() dto: OnboardUstadzDto) {
    return this.ustadzService.onboard(user.id, dto);
  }

  @Get('me/dashboard')
  @UseGuards(DemoAuthGuard)
  getDashboard(@CurrentUser() user: CurrentUserType) {
    return this.ustadzService.getDashboard(user.id);
  }

  @Patch(':profileId/approve')
  @UseGuards(DemoAdminGuard)
  approve(@Param('profileId') profileId: string) {
    return this.ustadzService.approve(profileId);
  }

  @Patch(':profileId/reject')
  @UseGuards(DemoAdminGuard)
  reject(@Param('profileId') profileId: string) {
    return this.ustadzService.reject(profileId);
  }
}
