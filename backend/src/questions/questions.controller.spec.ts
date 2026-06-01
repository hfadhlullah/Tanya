import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  const questionsService = {
    create: jest.fn(),
    listForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [{ provide: QuestionsService, useValue: questionsService }],
    }).compile();

    controller = module.get(QuestionsController);
  });

  it('creates questions for the current user', async () => {
    await controller.create({ id: 'user-1' }, { text: 'Apa itu thaharah?' });

    expect(questionsService.create).toHaveBeenCalledWith('user-1', {
      text: 'Apa itu thaharah?',
    });
  });

  it('lists only the current user questions', async () => {
    await controller.listMine({ id: 'user-1' });

    expect(questionsService.listForUser).toHaveBeenCalledWith('user-1');
  });
});
