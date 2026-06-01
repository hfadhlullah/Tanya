import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Get('users/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.questionsService.listForUser(userId);
  }
}
