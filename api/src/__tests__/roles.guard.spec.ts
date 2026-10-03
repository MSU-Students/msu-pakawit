import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../modules/users/entities/user.entity';
import { RolesGuard } from '../modules/users/roles.guard';
import { UserService } from '../modules/users/user.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let userService: { findById: jest.Mock };
  const handler = () => undefined;
  const controller = class {};
  let request: any;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) };
    userService = { findById: jest.fn() };
    request = { user: { sub: 'user-1', role: UserRole.ADMIN } };
    context = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    guard = new RolesGuard(reflector as unknown as Reflector, userService as unknown as UserService);
  });

  it('allows an active administrator based on the current database role', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN, isActive: true });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.currentUser.role).toBe(UserRole.ADMIN);
  });

  it('does not trust a stale ADMIN role claim in the access token', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', role: UserRole.STUDENT, isActive: true });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects deactivated administrators', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN, isActive: false });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});