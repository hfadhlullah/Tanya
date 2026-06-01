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
    importCorpus: jest.fn(),
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

  it('delegates corpus import', async () => {
    const dto = { type: 'QURAN' as const, title: 'Kemenag', license: 'approved' };
    const files = { files: [{ originalname: 'quran.json' }] as Express.Multer.File[] };

    await controller.importCorpus(dto, files);

    expect(corpusService.importCorpus).toHaveBeenCalledWith(dto, files.files);
  });
});
