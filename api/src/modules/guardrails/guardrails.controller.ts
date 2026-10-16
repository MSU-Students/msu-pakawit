import { Controller, Post, Body, Get, Query, Req, UseGuards, ForbiddenException, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ScheduleGuardService } from './schedule-guard.service';
import { CheckScheduleDto } from './dto/check-schedule.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { ActiveUserGuard } from '../users/active-user.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { OverrideScheduleLockDto } from './dto/override-schedule-lock.dto';
import { UserService } from '../users/user.service';

type AuthenticatedRequest = Request & { currentUser: User };

@ApiTags('Identity, Security & Guardrails (Team 4)')
@Controller('guardrails')
export class GuardrailsController {
  constructor(
    private readonly scheduleGuardService: ScheduleGuardService,
    private readonly userService: UserService,
  ) {}

  @Get('schedule-lock')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check the authenticated member schedule lock (admins may check another member)' })
  async checkSchedule(@Query() query: CheckScheduleDto, @Req() request: AuthenticatedRequest) {
    if (query.msuIdNumber !== request.currentUser.msuIdNumber && request.currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only check your own academic schedule');
    }
    const targetDate = query.timestamp ? new Date(query.timestamp) : new Date();
    const targetUser = query.msuIdNumber === request.currentUser.msuIdNumber
      ? request.currentUser
      : await this.userService.findByMsuIdWithSchedules(query.msuIdNumber);
    if (!targetUser) throw new NotFoundException('User not found');
    return this.scheduleGuardService.checkAndLogSchedule(targetUser.id, query.msuIdNumber, targetDate);
  }

  @Post('schedule-lock/override')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant a temporary, audited schedule-lock override (administrator only)' })
  grantScheduleOverride(@Body() dto: OverrideScheduleLockDto, @Req() request: AuthenticatedRequest) {
    return this.scheduleGuardService.grantOverride(dto, request.currentUser.id);
  }

  @Get('schedule-lock/:userId/audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Read schedule-lock decisions for a user (administrator only)' })
  getScheduleDecisionHistory(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.scheduleGuardService.getDecisionHistory(userId);
  }

}
