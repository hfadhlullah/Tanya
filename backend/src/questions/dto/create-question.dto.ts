import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @IsOptional()
  @IsString()
  @IsIn(['id'])
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  preferredUstadzId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}
