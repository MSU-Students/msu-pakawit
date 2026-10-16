import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../users/user.module';
import { AcademicSchedule } from './entities/academic-schedule.entity';
import { OTPLog } from './entities/otp-log.entity';
import { OTPAttemptLog } from './entities/otp-attempt-log.entity';
import { ScheduleGuardService } from './schedule-guard.service';
import { OtpService } from './otp.service';
import { GuardrailsController } from './guardrails.controller';
import { ScheduleLockDecision } from './entities/schedule-lock-decision.entity';
import { ScheduleLockOverride } from './entities/schedule-lock-override.entity';
import { EmailModule } from '../auth/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicSchedule, OTPLog, OTPAttemptLog, ScheduleLockDecision, ScheduleLockOverride]),
    UserModule,
    EmailModule,
  ],
  controllers: [GuardrailsController],
  providers: [ScheduleGuardService, OtpService],
  exports: [ScheduleGuardService, OtpService],
})
export class GuardrailsModule {}
