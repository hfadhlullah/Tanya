import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSourceDto {
  @IsIn(['QURAN', 'HADITH', 'USTADZ_CONTENT'])
  type!: 'QURAN' | 'HADITH' | 'USTADZ_CONTENT';

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reference?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  license!: string;

  @IsOptional()
  @IsIn(['id'])
  language?: string;
}
