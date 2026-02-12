import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@atempo/shared';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('allows when role is included', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.COACH])
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: Role.COACH } })
      })
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when role is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.PSY_CLUB])
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: Role.COACH } })
      })
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(false);
  });
});
