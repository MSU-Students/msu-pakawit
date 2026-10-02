export interface ScheduleBlock {
  id: string;
  courseCode: string;
  courseTitle: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // '09:00'
  endTime: string;   // '11:30'
  room: string;
}

export interface OTPVerificationResult {
  valid: boolean;
  message: string;
  completedAt?: number;
}
