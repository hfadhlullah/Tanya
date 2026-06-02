import { Module } from '@nestjs/common';
import { GraphExtractionService } from './graph-extraction.service';

@Module({
  providers: [GraphExtractionService],
  exports: [GraphExtractionService],
})
export class GraphModule {}
