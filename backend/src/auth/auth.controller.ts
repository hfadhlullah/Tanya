import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser, type CurrentUser as CurrentUserType } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class UpdatePreferencesDto {
  @IsArray()
  @IsString({ each: true })
  preferredUstadzIds!: string[];
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('guest')
  guest() {
    return this.authService.guestRegister();
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserType) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/preferences')
  getPreferences(@CurrentUser() user: CurrentUserType) {
    return this.authService.getPreferences(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/preferences')
  updatePreferences(@CurrentUser() user: CurrentUserType, @Body() dto: UpdatePreferencesDto) {
    return this.authService.updatePreferences(user.id, dto.preferredUstadzIds);
  }
}
