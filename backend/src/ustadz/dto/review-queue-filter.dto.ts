import { IsIn, IsOptional } from 'class-validator';

export class ReviewQueueFilterDto {
  @IsOptional()
  @IsIn(['today'])
  date?: string;

  @IsOptional()
  @IsIn(['sensitive', 'non-sensitive'])
  type?: string;
}
