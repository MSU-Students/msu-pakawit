import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../users/user.module';
import { SecurityModule } from '../shared/security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PendingRegistration } from './entities/pending-registration.entity';
import { EMAIL_SENDER } from './email/email-sender';
import { LocalMailboxEmailSender } from './email/local-mailbox-email-sender';
import { RegistrationRateLimiter } from './registration-rate-limiter';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PendingRegistration]),
    UserModule,
    SecurityModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RegistrationRateLimiter,
    LocalMailboxEmailSender,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, LocalMailboxEmailSender],
      useFactory: (config: ConfigService, localMailbox: LocalMailboxEmailSender) => {
        const provider = config.get<string>('EMAIL_PROVIDER') ?? 'local';
        if (provider !== 'local') {
          throw new Error(`Unsupported EMAIL_PROVIDER "${provider}"; only "local" is configured.`);
        }
        return localMailbox;
      },
    },
  ],
})
export class AuthModule {}