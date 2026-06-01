import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorpusModule } from './corpus/corpus.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { UstadzModule } from './ustadz/ustadz.module';

@Module({
  imports: [PrismaModule, QuestionsModule, CorpusModule, UstadzModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
