import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCorpusChunkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sourceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
