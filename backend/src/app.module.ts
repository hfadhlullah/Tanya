import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorpusModule } from './corpus/corpus.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';

@Module({
  imports: [PrismaModule, QuestionsModule, CorpusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
