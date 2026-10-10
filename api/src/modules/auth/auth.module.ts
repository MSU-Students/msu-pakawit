import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../users/user.module';
import { SecurityModule } from '../shared/security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule, UserModule, SecurityModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}