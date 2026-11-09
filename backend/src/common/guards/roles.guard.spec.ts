import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../users/enums/user-role.enum.js';

describe('RolesGuard', () => {
  const createContext = (role?: UserRole): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class Dummy {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { id: 'u1', role } : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when no @Roles metadata is set', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when user role matches required roles', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(UserRole.USER))).toThrow(
      ForbiddenException,
    );
  });
});
