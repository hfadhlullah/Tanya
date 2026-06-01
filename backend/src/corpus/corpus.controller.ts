import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { CorpusService } from './corpus.service';
import { CreateCorpusChunkDto } from './dto/create-corpus-chunk.dto';
import { CreateSourceDto } from './dto/create-source.dto';

@Controller('corpus')
export class CorpusController {
  constructor(private readonly corpusService: CorpusService) {}

  @Get('sources')
  listSources() {
    return this.corpusService.listSources();
  }

  @Post('sources')
  @UseGuards(DemoAdminGuard)
  createSource(@Body() dto: CreateSourceDto) {
    return this.corpusService.createSource(dto);
  }

  @Get('chunks')
  listChunks(@Query('sourceId') sourceId?: string) {
    return this.corpusService.listChunks(sourceId);
  }

  @Post('chunks')
  @UseGuards(DemoAdminGuard)
  createChunk(@Body() dto: CreateCorpusChunkDto) {
    return this.corpusService.createChunk(dto);
  }
}
