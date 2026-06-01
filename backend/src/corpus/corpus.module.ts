import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';

@Module({
  imports: [AuthModule],
  controllers: [CorpusController],
  providers: [CorpusService],
})
export class CorpusModule {}
