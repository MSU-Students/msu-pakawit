import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScheduleGuardService } from './schedule-guard.service';
import { CheckScheduleDto } from './dto/check-schedule.dto';

@ApiTags('Identity, Security & Guardrails (Team 4)')
@Controller('guardrails')
export class GuardrailsController {
  constructor(
    private readonly scheduleGuardService: ScheduleGuardService,
  ) {}

  @Get('schedule-lock')
  @ApiOperation({ summary: 'Check if courier is currently locked by academic class schedule' })
  async checkSchedule(@Query() query: CheckScheduleDto) {
    const targetDate = query.timestamp ? new Date(query.timestamp) : new Date();
    return this.scheduleGuardService.checkCourierScheduleLock(query.msuIdNumber, targetDate);
  }

}
