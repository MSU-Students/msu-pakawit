import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './security/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const expiresIn = Number(config.get('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? 3600);

        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must be configured with at least 32 characters');
        }
        if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
          throw new Error('JWT_ACCESS_TOKEN_TTL_SECONDS must be a positive integer');
        }

        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SecurityModule {}