import { Module } from '@nestjs/common';
import { AnswerBankService } from './answer-bank.service';
import { CorpusRetrievalService } from './corpus-retrieval.service';
import { SourcedAnswerService } from './sourced-answer.service';

@Module({
  providers: [AnswerBankService, CorpusRetrievalService, SourcedAnswerService],
  exports: [AnswerBankService, CorpusRetrievalService, SourcedAnswerService],
})
export class AnswersModule {}
