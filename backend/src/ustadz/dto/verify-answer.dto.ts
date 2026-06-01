import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyAnswerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body?: string;
}
