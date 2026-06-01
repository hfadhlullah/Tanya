import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUstadzDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  publicName!: string;
}
