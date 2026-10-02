import {
  timeToMinutes,
  isCourierLockedBySchedule,
} from '../modules/guardrails/scheduleValidator';
import type { ScheduleBlock } from '../modules/guardrails/types';

describe('Schedule Validator (Academic Time-Lock Guardrails)', () => {
  it('converts HH:MM format into total minutes correctly', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(8 * 60 + 30);
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('throws error on invalid time strings', () => {
    expect(() => timeToMinutes('25:00')).toThrow();
    expect(() => timeToMinutes('invalid')).toThrow();
  });

  it('detects active class conflict and locks courier shift', () => {
    const schedules: ScheduleBlock[] = [
      {
        id: 'sched-1',
        courseCode: 'CS121',
        courseTitle: 'Data Structures',
        dayOfWeek: 1, // Monday
        startTime: '08:30',
        endTime: '10:00',
        room: 'Lab 2',
      },
    ];

    // Simulate Monday at 09:15 AM
    const mondayClassTime = new Date('2026-09-28T09:15:00'); // 2026-09-28 is Monday
    const result = isCourierLockedBySchedule(schedules, mondayClassTime);

    expect(result.isLocked).toBe(true);
    expect(result.activeBlock?.courseCode).toBe('CS121');
  });

  it('allows shifts when courier is outside registered class hours', () => {
    const schedules: ScheduleBlock[] = [
      {
        id: 'sched-1',
        courseCode: 'CS121',
        courseTitle: 'Data Structures',
        dayOfWeek: 1, // Monday
        startTime: '08:30',
        endTime: '10:00',
        room: 'Lab 2',
      },
    ];

    // Monday at 11:30 AM (after class)
    const mondayFreeTime = new Date('2026-09-28T11:30:00');
    const result = isCourierLockedBySchedule(schedules, mondayFreeTime);

    expect(result.isLocked).toBe(false);
  });
});
