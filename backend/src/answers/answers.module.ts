import { Module } from '@nestjs/common';
import { AnswerBankService } from './answer-bank.service';

@Module({
  providers: [AnswerBankService],
  exports: [AnswerBankService],
})
export class AnswersModule {}
