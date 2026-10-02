import React from 'react';
import { Calendar, Lock, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { isCourierLockedBySchedule } from './scheduleValidator';
import type { ScheduleBlock } from './types';

export interface AcademicScheduleGuardProps {
  studentName: string;
  studentId: string;
  schedules: ScheduleBlock[];
  simulatedTime?: Date;
}

export const AcademicScheduleGuard: React.FC<AcademicScheduleGuardProps> = ({
  studentName,
  studentId,
  schedules,
  simulatedTime = new Date(),
}) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const guardStatus = isCourierLockedBySchedule(schedules, simulatedTime);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-msu-maroon" />
          Academic Time-Lock Guardrail System
        </h2>
        <p className="text-xs text-slate-500">
          Automated academic protection: Shifts & errand acceptances automatically lock during class hours
        </p>
      </div>

      {/* Real-time Status Card */}
      <Card
        className={`border-2 ${
          guardStatus.isLocked
            ? 'bg-amber-50/70 border-amber-400'
            : 'bg-emerald-50/70 border-emerald-400'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-full ${
                guardStatus.isLocked ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              {guardStatus.isLocked ? <Lock className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">
                  {studentName} ({studentId})
                </span>
                <Badge variant={guardStatus.isLocked ? 'warning' : 'success'}>
                  {guardStatus.isLocked ? 'Shift Locked (In Class)' : 'Available for Courier Shifts'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {guardStatus.isLocked
                  ? `Active class conflict: ${guardStatus.activeBlock?.courseCode} (${guardStatus.activeBlock?.startTime} - ${guardStatus.activeBlock?.endTime}) in ${guardStatus.activeBlock?.room}`
                  : 'No class schedule conflict detected. Free to accept campus errand requests.'}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 bg-white/80 p-2.5 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-700">Guardrail Engine: Active</div>
            <div className="font-mono text-[11px] text-slate-500">
              Evaluated: {dayNames[simulatedTime.getDay()]} {simulatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </Card>

      {/* Registered Course Schedule Table */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-msu-maroon" />
            <h3 className="font-bold text-slate-800 text-sm">Registered Academic Schedule</h3>
          </div>
          <span className="text-xs text-slate-500">Synced from MSU Registrar Block</span>
        </div>

        <div className="divide-y divide-slate-100">
          {schedules.map((block) => (
            <div
              key={block.id}
              className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/50 px-2 rounded"
            >
              <div>
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <span>{block.courseCode}: {block.courseTitle}</span>
                  <Badge variant="neutral" size="sm">{dayNames[block.dayOfWeek]}</Badge>
                </div>
                <div className="text-slate-500 mt-0.5">Room: {block.room}</div>
              </div>

              <div className="text-right">
                <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  {block.startTime} - {block.endTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
