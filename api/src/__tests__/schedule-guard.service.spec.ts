import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleGuardService } from '../modules/guardrails/schedule-guard.service';
import { AcademicSchedule } from '../modules/guardrails/entities/academic-schedule.entity';
import { User, UserRole } from '../modules/guardrails/entities/user.entity';

describe('ScheduleGuardService (Academic Time-Lock System)', () => {
  let service: ScheduleGuardService;
  let mockUserRepo: any;
  let mockScheduleRepo: any;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
    };
    mockScheduleRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleGuardService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(AcademicSchedule),
          useValue: mockScheduleRepo,
        },
      ],
    }).compile();

    service = module.get<ScheduleGuardService>(ScheduleGuardService);
  });

  it('should lock courier shift when current time falls within class schedule', async () => {
    const mockUser: Partial<User> = {
      id: 'u-1',
      msuIdNumber: '2023-01429',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role: UserRole.STUDENT,
      academicSchedules: [
        {
          id: 's-1',
          userId: 'u-1',
          courseCode: 'CS121',
          courseTitle: 'Data Structures',
          dayOfWeek: 1, // Monday
          startTime: '08:30',
          endTime: '10:00',
          room: 'Science Lab 2',
          isLocked: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        },
      ],
    };

    mockUserRepo.findOne.mockResolvedValue(mockUser);

    // Monday at 09:00 AM (in class)
    const testMondayTime = new Date('2026-09-28T09:00:00');
    const result = await service.checkCourierScheduleLock('2023-01429', testMondayTime);

    expect(result.isLocked).toBe(true);
    expect(result.activeCourse).toBe('CS121');
  });

  it('should allow courier shift when courier has no class at the specified time', async () => {
    const mockUser: Partial<User> = {
      id: 'u-1',
      msuIdNumber: '2023-01429',
      academicSchedules: [
        {
          id: 's-1',
          userId: 'u-1',
          courseCode: 'CS121',
          courseTitle: 'Data Structures',
          dayOfWeek: 1,
          startTime: '08:30',
          endTime: '10:00',
          room: 'Science Lab 2',
          isLocked: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        },
      ],
    };

    mockUserRepo.findOne.mockResolvedValue(mockUser);

    // Monday at 11:00 AM (after class)
    const testMondayAfternoon = new Date('2026-09-28T11:00:00');
    const result = await service.checkCourierScheduleLock('2023-01429', testMondayAfternoon);

    expect(result.isLocked).toBe(false);
  });
});
