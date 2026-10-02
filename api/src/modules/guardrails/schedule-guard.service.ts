import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicSchedule } from './entities/academic-schedule.entity';
import { User } from './entities/user.entity';

@Injectable()
export class ScheduleGuardService {
  constructor(
    @InjectRepository(AcademicSchedule)
    private readonly scheduleRepo: Repository<AcademicSchedule>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
  }

  async checkCourierScheduleLock(msuIdNumber: string, date: Date = new Date()) {
    const user = await this.userRepo.findOne({
      where: { msuIdNumber },
      relations: ['academicSchedules'],
    });

    if (!user || !user.academicSchedules || user.academicSchedules.length === 0) {
      return {
        isLocked: false,
        reason: 'No class schedules registered or free period',
        msuIdNumber,
      };
    }

    const currentDay = date.getDay();
    const currentMinutes = date.getHours() * 60 + date.getMinutes();

    const activeConflict = user.academicSchedules.find((sched) => {
      if (!sched.isLocked || sched.dayOfWeek !== currentDay) return false;
      const startMin = this.timeToMinutes(sched.startTime);
      const endMin = this.timeToMinutes(sched.endTime);
      return currentMinutes >= startMin && currentMinutes <= endMin;
    });

    if (activeConflict) {
      return {
        isLocked: true,
        reason: 'Courier is currently in registered class/exam hours',
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
      reason: 'Outside registered class hours. Courier is eligible for errands.',
      msuIdNumber,
    };
  }
}
