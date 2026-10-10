import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user?.sub ? await this.userService.findById(request.user.sub) : null;
    if (!user?.isActive) throw new UnauthorizedException();
    request.currentUser = user;
    return true;
  }
}