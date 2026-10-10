import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = argon2.hash(randomBytes(32), { type: argon2.argon2id });

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userService.findByUsernameForAuth(dto.username);
    let passwordMatches: boolean;
    try {
      const hashToVerify = user?.passwordHash ?? (await this.dummyPasswordHash);
      passwordMatches = await argon2.verify(hashToVerify, dto.password);
    } catch {
      passwordMatches = false;
    }

    if (!user || !user.isActive || !passwordMatches) throw new UnauthorizedException('Invalid username or password');

    const expiresIn = Number(this.config.get('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? 3600);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}