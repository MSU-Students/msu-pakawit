import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from './user.service';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from './entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const currentUser = user?.sub ? await this.userService.findById(user.sub) : null;
    if (!currentUser?.isActive || !requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException();
    }

    request.currentUser = currentUser;
    return true;
  }
}