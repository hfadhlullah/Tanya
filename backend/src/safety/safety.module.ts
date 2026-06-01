import { Module } from '@nestjs/common';
import { AnswersModule } from '../answers/answers.module';
import { SafetyService } from './safety.service';

@Module({
  imports: [AnswersModule],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
