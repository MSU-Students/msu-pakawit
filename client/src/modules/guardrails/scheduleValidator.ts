import type { ScheduleBlock } from './types';

/**
 * Parses 'HH:MM' string into minutes from midnight for direct numerical comparison.
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
  }
  return hours * 60 + minutes;
}

/**
 * Checks if a given timestamp (or current time) overlaps with any locked academic class schedule.
 * Returns { isLocked: true, activeBlock: ScheduleBlock } if inside class hours.
 */
export function isCourierLockedBySchedule(
  schedules: ScheduleBlock[],
  currentDate: Date = new Date()
): { isLocked: boolean; activeBlock?: ScheduleBlock } {
  const currentDay = currentDate.getDay();
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

  for (const block of schedules) {
    if (block.dayOfWeek === currentDay) {
      const startMin = timeToMinutes(block.startTime);
      const endMin = timeToMinutes(block.endTime);

      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        return {
          isLocked: true,
          activeBlock: block,
        };
      }
    }
  }

  return { isLocked: false };
}
