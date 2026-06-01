import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'tanya-api',
      status: 'ok',
    };
  }
}
