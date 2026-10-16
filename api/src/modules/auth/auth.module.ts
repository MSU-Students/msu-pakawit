import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../users/user.module';
import { SecurityModule } from '../shared/security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationVerification } from './entities/registration-verification.entity';
import { EmailModule } from './email.module';

@Module({
  imports: [ConfigModule, UserModule, SecurityModule, EmailModule, TypeOrmModule.forFeature([RegistrationVerification])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}