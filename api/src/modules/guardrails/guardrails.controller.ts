import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScheduleGuardService } from './schedule-guard.service';
import { OtpService } from './otp.service';
import { CheckScheduleDto } from './dto/check-schedule.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Identity, Security & Guardrails (Team 4)')
@Controller('guardrails')
export class GuardrailsController {
  constructor(
    private readonly scheduleGuardService: ScheduleGuardService,
    private readonly otpService: OtpService,
  ) {}

  @Get('schedule-lock')
  @ApiOperation({ summary: 'Check if courier is currently locked by academic class schedule' })
  async checkSchedule(@Query() query: CheckScheduleDto) {
    const targetDate = query.timestamp ? new Date(query.timestamp) : new Date();
    return this.scheduleGuardService.checkCourierScheduleLock(query.msuIdNumber, targetDate);
  }

  @Post('otp/generate')
  @ApiOperation({ summary: 'Generate 4-digit OTP code for buyer drop-zone handoff' })
  async generateOtp(@Body('errandId') errandId: string) {
    const code = await this.otpService.generateOtp(errandId);
    return { errandId, otpCode: code, message: 'OTP generated. Buyer provides this code to courier at drop zone.' };
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Verify 4-digit OTP code upon physical handoff at campus drop zone' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto.errandId, dto.otpCode);
  }
}
