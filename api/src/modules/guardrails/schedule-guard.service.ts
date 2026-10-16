import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import { UserRole } from '../users/entities/user.entity';
import { OverrideScheduleLockDto } from './dto/override-schedule-lock.dto';
import { ScheduleLockDecision, ScheduleLockDecisionType } from './entities/schedule-lock-decision.entity';
import { ScheduleLockOverride } from './entities/schedule-lock-override.entity';

export interface ScheduleCheckResult {
  isLocked: boolean;
  reason: string;
  msuIdNumber: string;
  activeCourse?: string;
  courseTitle?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
}

const eligibleRoles = new Set([UserRole.STUDENT, UserRole.COURIER]);

@Injectable()
export class ScheduleGuardService {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(ScheduleLockDecision)
    private readonly decisionRepo: Repository<ScheduleLockDecision>,
    @InjectRepository(ScheduleLockOverride)
    private readonly overrideRepo: Repository<ScheduleLockOverride>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    new Intl.DateTimeFormat('en-US', {
      timeZone: this.config.get<string>('ACADEMIC_TIMEZONE') ?? 'Asia/Manila',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  async checkCourierScheduleLock(msuIdNumber: string, date: Date = new Date()): Promise<ScheduleCheckResult> {
    const user = await this.userService.findByMsuIdWithSchedules(msuIdNumber);

    if (!user) throw new NotFoundException('User not found');

    if (!eligibleRoles.has(user.role)) {
      return {
        isLocked: false,
        reason: 'Academic time-lock does not apply to this user role',
        msuIdNumber,
      };
    }

    if (!user.academicSchedules || user.academicSchedules.length === 0) {
      return {
        isLocked: false,
        reason: 'No class schedules registered or free period',
        msuIdNumber,
      };
    }

    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.config.get<string>('ACADEMIC_TIMEZONE') ?? 'Asia/Manila',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: string) => dateParts.find((entry) => entry.type === type)?.value;
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday') ?? '');
    const currentMinutes = Number(part('hour')) * 60 + Number(part('minute'));

    const activeConflict = user.academicSchedules.find((sched) => {
      if (!sched.isLocked || sched.dayOfWeek !== currentDay) return false;
      const startMin = this.timeToMinutes(sched.startTime);
      const endMin = this.timeToMinutes(sched.endTime);
      return currentMinutes >= startMin && currentMinutes < endMin;
    });

    if (activeConflict) {
      return {
        isLocked: true,
        reason: 'User is currently in registered class/exam hours',
        activeCourse: activeConflict.courseCode,
        courseTitle: activeConflict.courseTitle,
        startTime: activeConflict.startTime,
        endTime: activeConflict.endTime,
        room: activeConflict.room,
        msuIdNumber,
      };
    }

    return {
      isLocked: false,
      reason: 'Outside registered class hours. Restricted activities are available.',
      msuIdNumber,
    };
  }

  async authorizeRestrictedActivity(
    userId: string,
    msuIdNumber: string,
    activity: string,
    date: Date = new Date(),
  ): Promise<void> {
    const user = await this.userService.findByMsuIdWithSchedules(msuIdNumber);
    if (!user || user.id !== userId) throw new NotFoundException('User not found');

    const check = await this.checkCourierScheduleLock(msuIdNumber, date);
    if (!check.isLocked) {
      await this.logDecision(user.id, user.role, activity, ScheduleLockDecisionType.ALLOWED, check.reason);
      return;
    }

    const override = await this.overrideRepo.findOne({
      where: { userId, expiresAt: MoreThan(date) },
      order: { createdAt: 'DESC' },
    });
    if (override) {
      await this.logDecision(
        user.id,
        user.role,
        activity,
        ScheduleLockDecisionType.ALLOWED,
        `Allowed by temporary administrator override until ${override.expiresAt.toISOString()}`,
        check.activeCourse,
        override.grantedByUserId,
        override.reason,
      );
      return;
    }

    const reason = check.activeCourse
      ? `Restricted during ${check.activeCourse} (${check.startTime}-${check.endTime}${check.room ? `, ${check.room}` : ''}).`
      : check.reason;
    await this.logDecision(
      user.id,
      user.role,
      activity,
      ScheduleLockDecisionType.BLOCKED,
      reason,
      check.activeCourse,
    );

    throw new ForbiddenException({
      message: `This activity is unavailable during your scheduled academic time. ${reason}`,
      timeLock: check,
    });
  }

  async checkAndLogSchedule(userId: string, msuIdNumber: string, date: Date = new Date()) {
    const user = await this.userService.findByMsuIdWithSchedules(msuIdNumber);
    if (!user || user.id !== userId) throw new NotFoundException('User not found');
    const result = await this.checkCourierScheduleLock(msuIdNumber, date);
    await this.logDecision(
      user.id,
      user.role,
      'SCHEDULE_CHECK',
      result.isLocked ? ScheduleLockDecisionType.BLOCKED : ScheduleLockDecisionType.ALLOWED,
      result.reason,
      result.activeCourse,
    );
    return result;
  }

  async grantOverride(dto: OverrideScheduleLockDto, administratorId: string) {
    const target = await this.userService.findById(dto.userId);
    if (!target) throw new NotFoundException('User not found');
    if (!eligibleRoles.has(target.role)) {
      throw new ForbiddenException('Academic time-lock overrides apply only to students and couriers');
    }

    const override = this.overrideRepo.create({
      userId: target.id,
      grantedByUserId: administratorId,
      reason: dto.reason.trim(),
      expiresAt: new Date(Date.now() + dto.durationMinutes * 60_000),
    });
    const saved = await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ScheduleLockOverride).save(override);
      const decision = manager.getRepository(ScheduleLockDecision).create({
        userId: target.id,
        userRole: target.role,
        activity: 'ADMIN_OVERRIDE',
        decision: ScheduleLockDecisionType.OVERRIDE_GRANTED,
        reason: `Temporary override granted until ${override.expiresAt.toISOString()}`,
        overriddenByUserId: administratorId,
        overrideReason: override.reason,
      });
      await manager.getRepository(ScheduleLockDecision).save(decision);
      return override;
    });

    return {
      userId: saved.userId,
      expiresAt: saved.expiresAt,
      reason: saved.reason,
    };
  }

  async getDecisionHistory(userId: string, limit = 100): Promise<ScheduleLockDecision[]> {
    return this.decisionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  private async logDecision(
    userId: string,
    userRole: UserRole,
    activity: string,
    decision: ScheduleLockDecisionType,
    reason: string,
    courseCode: string | undefined = undefined,
    overriddenByUserId: string | undefined = undefined,
    overrideReason: string | undefined = undefined,
  ): Promise<void> {
    await this.decisionRepo.save(this.decisionRepo.create({
      userId,
      userRole,
      activity,
      decision,
      reason,
      courseCode: courseCode ?? null,
      overriddenByUserId: overriddenByUserId ?? null,
      overrideReason: overrideReason ?? null,
    }));
  }
}
