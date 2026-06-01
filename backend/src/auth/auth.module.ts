import { Module } from '@nestjs/common';
import { DemoAdminGuard } from './demo-admin.guard';
import { DemoAuthGuard } from './demo-auth.guard';

@Module({
  providers: [DemoAdminGuard, DemoAuthGuard],
  exports: [DemoAdminGuard, DemoAuthGuard],
})
export class AuthModule {}
