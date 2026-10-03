import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    const match = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i) : null;

    if (!match) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(match[1]);
      if (!payload.sub || !payload.username) throw new Error('Invalid token subject');
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}