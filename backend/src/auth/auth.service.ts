import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async guestRegister() {
    const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@tanya.guest`;
    const user = await this.prisma.user.create({
      data: { email: guestEmail, isGuest: true },
    });
    return { token: this.sign(user), user: this.toPublic(user) };
  }

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    return { token: this.sign(user), user: this.toPublic(user) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return { token: this.sign(user), user: this.toPublic(user) };
  }

  async validatePayload(payload: JwtPayload) {
    return this.prisma.user.findUnique({ where: { id: payload.sub } });
  }

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredUstadzIds: true },
    });
    return { preferredUstadzIds: user?.preferredUstadzIds ?? [] };
  }

  async updatePreferences(userId: string, preferredUstadzIds: string[]) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredUstadzIds },
    });
    return { preferredUstadzIds };
  }

  private sign(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.sign(payload);
  }

  private toPublic(user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    isGuest?: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isGuest: user.isGuest ?? false,
    };
  }
}
