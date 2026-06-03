import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReviewAction } from '@prisma/client';

export class VerifyAnswerDto {
  // Ustadz-edited final text. Presence implies an EDIT unless an explicit
  // action is provided.
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body?: string;

  // Free-text feedback / rationale from the ustadz, stored in the review record.
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  note?: string;

  // Explicit review action. If omitted, derived from `body` (EDIT vs APPROVE).
  @IsOptional()
  @IsEnum(ReviewAction)
  action?: ReviewAction;
}
