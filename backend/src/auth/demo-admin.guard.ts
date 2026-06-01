import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class DemoAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const adminKey = request.header('x-demo-admin-key');

    if (!process.env.DEMO_ADMIN_KEY || adminKey !== process.env.DEMO_ADMIN_KEY) {
      throw new UnauthorizedException('Missing demo admin key');
    }

    return true;
  }
}
