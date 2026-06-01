import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DemoAdminGuard } from './demo-admin.guard';

describe('DemoAdminGuard', () => {
  const guard = new DemoAdminGuard();
  const originalAdminKey = process.env.DEMO_ADMIN_KEY;

  afterEach(() => {
    process.env.DEMO_ADMIN_KEY = originalAdminKey;
  });

  function contextWithHeader(value?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: jest.fn().mockReturnValue(value),
        }),
      }),
    } as ExecutionContext;
  }

  it('accepts matching demo admin key', () => {
    process.env.DEMO_ADMIN_KEY = 'secret';

    expect(guard.canActivate(contextWithHeader('secret'))).toBe(true);
  });

  it('rejects missing or mismatched key', () => {
    process.env.DEMO_ADMIN_KEY = 'secret';

    expect(() => guard.canActivate(contextWithHeader('wrong'))).toThrow(
      UnauthorizedException,
    );
  });
});
