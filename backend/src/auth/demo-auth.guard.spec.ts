import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DemoAuthGuard } from './demo-auth.guard';

describe('DemoAuthGuard', () => {
  const guard = new DemoAuthGuard();

  function contextWithHeader(value?: string) {
    const request = {
      header: jest.fn().mockReturnValue(value),
      user: undefined,
    };

    return {
      request,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext,
    };
  }

  it('sets current user from demo header', () => {
    const { context, request } = contextWithHeader(' user-1 ');

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it('rejects requests without demo header', () => {
    const { context } = contextWithHeader();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
