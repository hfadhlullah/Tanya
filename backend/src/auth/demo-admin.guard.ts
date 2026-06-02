import {
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class DemoAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const adminKey = request.header('x-demo-admin-key');
    const expectedAdminKey = process.env.DEMO_ADMIN_KEY;

    if (!expectedAdminKey) {
      throw new InternalServerErrorException(
        'Server demo admin key is not configured',
      );
    }

    if (adminKey !== expectedAdminKey) {
      throw new UnauthorizedException('Invalid demo admin key');
    }

    return true;
  }
}
