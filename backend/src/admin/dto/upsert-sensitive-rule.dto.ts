import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpsertSensitiveRuleDto {
  @IsOptional()
  @IsIn(['GLOBAL', 'USTADZ'])
  scope?: 'GLOBAL' | 'USTADZ';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  ustadzId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pattern?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
