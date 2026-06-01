import { Module } from '@nestjs/common';
import { AnswersModule } from '../answers/answers.module';
import { SafetyModule } from '../safety/safety.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [AnswersModule, SafetyModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
