import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type CurrentUser as CurrentUserType,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionsService } from './questions.service';

@UseGuards(JwtAuthGuard)
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

  @Delete('session/:sessionId')
  deleteSession(
    @CurrentUser() user: CurrentUserType,
    @Param('sessionId') sessionId: string,
  ) {
    return this.questionsService.deleteSession(user.id, sessionId);
  }
}
