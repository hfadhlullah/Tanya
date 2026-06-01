import { Test, TestingModule } from '@nestjs/testing';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';

describe('CorpusController', () => {
  let controller: CorpusController;
  const corpusService = {
    createSource: jest.fn(),
    listSources: jest.fn(),
    createChunk: jest.fn(),
    listChunks: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorpusController],
      providers: [{ provide: CorpusService, useValue: corpusService }],
    }).compile();

    controller = module.get(CorpusController);
  });

  it('delegates source creation', async () => {
    const dto = { type: 'QURAN' as const, title: 'Kemenag', license: 'approved' };

    await controller.createSource(dto);

    expect(corpusService.createSource).toHaveBeenCalledWith(dto);
  });

  it('filters chunks by source id', async () => {
    await controller.listChunks('source-1');

    expect(corpusService.listChunks).toHaveBeenCalledWith('source-1');
  });
});
