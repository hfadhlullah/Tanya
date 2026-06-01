import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { UstadzController } from './ustadz.controller';
import { UstadzService } from './ustadz.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [UstadzController],
  providers: [UstadzService],
})
export class UstadzModule {}
