import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { StorageModule } from '../storage/storage.module';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';

@Module({
  imports: [AuthModule, JobsModule, StorageModule],
  controllers: [CorpusController],
  providers: [CorpusService],
})
export class CorpusModule {}
