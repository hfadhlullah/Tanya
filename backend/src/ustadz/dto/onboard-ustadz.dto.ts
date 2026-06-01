import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class OnboardUstadzDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  publicName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  credentials?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  publicProfile?: string;

  @IsArray()
  @IsString({ each: true })
  specialties!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  madhhab?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gatedTopics?: string[];
}
