import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type CurrentUser as CurrentUserType } from '../auth/current-user.decorator';
import { DemoAuthGuard } from '../auth/demo-auth.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

@UseGuards(DemoAuthGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(user.id, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: CurrentUserType) {
    return this.questionsService.listForUser(user.id);
  }
}
