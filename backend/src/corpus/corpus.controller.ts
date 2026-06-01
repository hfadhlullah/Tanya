import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { DemoAdminGuard } from '../auth/demo-admin.guard';
import { CorpusService } from './corpus.service';
import { CreateCorpusChunkDto } from './dto/create-corpus-chunk.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { ImportCorpusDto } from './dto/import-corpus.dto';

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

  @Post('sources/:sourceId/upload')
  @UseGuards(DemoAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadSourceFile(
    @Param('sourceId') sourceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.corpusService.uploadSourceFile(sourceId, file);
  }

  @Post('import')
  @UseGuards(DemoAdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 200 },
      ],
      { limits: { fileSize: 50 * 1024 * 1024 } },
    ),
  )
  importCorpus(
    @Body() dto: ImportCorpusDto,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; files?: Express.Multer.File[] },
  ) {
    const uploadedFiles = [...(files?.file ?? []), ...(files?.files ?? [])];
    if (uploadedFiles.length === 0)
      throw new BadRequestException('file or files is required');
    return this.corpusService.importCorpus(dto, uploadedFiles);
  }
}
