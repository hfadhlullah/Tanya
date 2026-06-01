import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UstadzController } from './ustadz.controller';
import { UstadzService } from './ustadz.service';

@Module({
  imports: [AuthModule],
  controllers: [UstadzController],
  providers: [UstadzService],
})
export class UstadzModule {}
