import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AcademicSchedule } from './entities/academic-schedule.entity';
import { OTPLog } from './entities/otp-log.entity';
import { ScheduleGuardService } from './schedule-guard.service';
import { OtpService } from './otp.service';
import { GuardrailsController } from './guardrails.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, AcademicSchedule, OTPLog])],
  controllers: [GuardrailsController],
  providers: [ScheduleGuardService, OtpService],
  exports: [ScheduleGuardService, OtpService],
})
export class GuardrailsModule {}
