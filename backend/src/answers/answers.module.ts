import { Module } from '@nestjs/common';
import { AnswerBankService } from './answer-bank.service';
import { CorpusRetrievalService } from './corpus-retrieval.service';
import { LlmClientService } from './llm-client.service';
import { SourcedAnswerService } from './sourced-answer.service';

@Module({
  providers: [
    LlmClientService,
    AnswerBankService,
    CorpusRetrievalService,
    SourcedAnswerService,
  ],
  exports: [
    LlmClientService,
    AnswerBankService,
    CorpusRetrievalService,
    SourcedAnswerService,
  ],
})
export class AnswersModule {}
