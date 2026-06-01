import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type CurrentUser as CurrentUserType } from '../auth/current-user.decorator';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardUstadzDto } from './dto/onboard-ustadz.dto';
import { VerifyAnswerDto } from './dto/verify-answer.dto';
import { UstadzService } from './ustadz.service';

@Controller('ustadz')
export class UstadzController {
  constructor(private readonly ustadzService: UstadzService) {}

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  onboard(@CurrentUser() user: CurrentUserType, @Body() dto: OnboardUstadzDto) {
    return this.ustadzService.onboard(user.id, dto);
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  listPublic() {
    return this.ustadzService.listPublicUstadz();
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: CurrentUserType) {
    return this.ustadzService.getProfile(user.id);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: CurrentUserType, @Body() dto: OnboardUstadzDto) {
    return this.ustadzService.updateProfile(user.id, dto);
  }

  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUser() user: CurrentUserType) {
    return this.ustadzService.getDashboard(user.id);
  }

  @Get('me/review-queue')
  @UseGuards(JwtAuthGuard)
  getReviewQueue(@CurrentUser() user: CurrentUserType) {
    return this.ustadzService.getReviewQueue(user.id);
  }

  @Post('me/credentials/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadCredential(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
    @Query('label') label?: string,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.ustadzService.uploadCredential(user.id, file, label);
  }

  @Patch('answers/:answerId/verify')
  @UseGuards(JwtAuthGuard)
  verifyAnswer(
    @CurrentUser() user: CurrentUserType,
    @Param('answerId') answerId: string,
    @Body() dto: VerifyAnswerDto,
  ) {
    return this.ustadzService.verifyAnswer(user.id, answerId, dto);
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
