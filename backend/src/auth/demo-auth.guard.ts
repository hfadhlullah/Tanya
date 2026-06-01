import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

type DemoAuthRequest = Request & {
  user?: {
    id: string;
  };
};

@Injectable()
export class DemoAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<DemoAuthRequest>();
    const userId = request.header('x-demo-user-id')?.trim();

    if (!userId) {
      throw new UnauthorizedException('Missing demo user header');
    }

    request.user = { id: userId };
    return true;
  }
}
