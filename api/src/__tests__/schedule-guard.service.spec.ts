import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleGuardService } from '../modules/guardrails/schedule-guard.service';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleLockDecision } from '../modules/guardrails/entities/schedule-lock-decision.entity';
import { ScheduleLockOverride } from '../modules/guardrails/entities/schedule-lock-override.entity';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

describe('ScheduleGuardService (Academic Time-Lock System)', () => {
  let service: ScheduleGuardService;
  let mockUserService: { findByMsuIdWithSchedules: jest.Mock; findById: jest.Mock };
  let decisionRepo: { create: jest.Mock; save: jest.Mock };
  let overrideRepo: { create: jest.Mock; findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let testManager: { getRepository: jest.Mock };
  let transactionDecisionRepo: { create: jest.Mock; save: jest.Mock };
  let transactionOverrideRepo: { save: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      findByMsuIdWithSchedules: jest.fn(),
      findById: jest.fn(),
    };
    decisionRepo = {
      create: jest.fn((entry) => entry),
      save: jest.fn(async (entry) => entry),
    };
    overrideRepo = {
      create: jest.fn((entry) => entry),
      findOne: jest.fn().mockResolvedValue(null),
    };
    transactionDecisionRepo = {
      create: jest.fn((entry) => entry),
      save: jest.fn(async (entry) => entry),
    };
    transactionOverrideRepo = { save: jest.fn(async (entry) => entry) };
    testManager = {
      getRepository: jest.fn((entity) => entity === ScheduleLockOverride
        ? transactionOverrideRepo
        : transactionDecisionRepo),
    };
    dataSource = { transaction: jest.fn((callback) => callback(testManager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleGuardService,
        { provide: UserService, useValue: mockUserService },
        { provide: getRepositoryToken(ScheduleLockDecision), useValue: decisionRepo },
        { provide: getRepositoryToken(ScheduleLockOverride), useValue: overrideRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('Asia/Manila') } },
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

    mockUserService.findByMsuIdWithSchedules.mockResolvedValue(mockUser);

    // Monday at 09:00 AM (in class)
    const testMondayTime = new Date('2026-09-28T01:00:00Z');
    const result = await service.checkCourierScheduleLock('2023-01429', testMondayTime);

    expect(result.isLocked).toBe(true);
    expect(result.activeCourse).toBe('CS121');
  });

  it('should allow courier shift when courier has no class at the specified time', async () => {
    const mockUser: Partial<User> = {
      id: 'u-1',
      msuIdNumber: '2023-01429',
      role: UserRole.COURIER,
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

    mockUserService.findByMsuIdWithSchedules.mockResolvedValue(mockUser);

    // Monday at 11:00 AM (after class)
    const testMondayAfternoon = new Date('2026-09-28T03:00:00Z');
    const result = await service.checkCourierScheduleLock('2023-01429', testMondayAfternoon);

    expect(result.isLocked).toBe(false);
  });

  it('does not lock employees and does not need a registered schedule', async () => {
    mockUserService.findByMsuIdWithSchedules.mockResolvedValue({
      id: 'employee-1',
      role: UserRole.EMPLOYEE,
      academicSchedules: [],
    });
    const result = await service.checkCourierScheduleLock('employee-id', new Date('2026-09-28T01:00:00Z'));
    expect(result.isLocked).toBe(false);
    expect(result.reason).toMatch(/does not apply/i);
  });

  it('blocks eligible users during class and writes an audit decision', async () => {
    mockUserService.findByMsuIdWithSchedules.mockResolvedValue({
      id: 'student-1',
      role: UserRole.STUDENT,
      academicSchedules: [{
        isLocked: true,
        dayOfWeek: 1,
        startTime: '08:30',
        endTime: '10:00',
        courseCode: 'CS121',
        courseTitle: 'Data Structures',
        room: 'Science Lab 2',
      }],
    });

    let error: any;
    try {
      await service.authorizeRestrictedActivity(
      'student-1',
      '2023-01429',
      'CLAIM_ERRAND',
      new Date('2026-09-28T01:00:00Z'),
      );
    } catch (caught) {
      error = caught;
    }
    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toMatchObject({
      message: expect.stringMatching(/unavailable during your scheduled academic time/i),
      timeLock: { activeCourse: 'CS121', room: 'Science Lab 2' },
    });
    expect(decisionRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'BLOCKED',
      activity: 'CLAIM_ERRAND',
      courseCode: 'CS121',
    }));
  });

  it('allows and audits eligible users while a valid administrator override is active', async () => {
    mockUserService.findByMsuIdWithSchedules.mockResolvedValue({
      id: 'courier-1',
      role: UserRole.COURIER,
      academicSchedules: [{
        isLocked: true,
        dayOfWeek: 1,
        startTime: '08:30',
        endTime: '10:00',
        courseCode: 'CS121',
        courseTitle: 'Data Structures',
        room: 'Science Lab 2',
      }],
    });
    overrideRepo.findOne.mockResolvedValue({
      expiresAt: new Date('2026-09-28T01:30:00Z'),
      grantedByUserId: 'admin-1',
      reason: 'Emergency campus delivery',
    });

    await expect(service.authorizeRestrictedActivity(
      'courier-1',
      '2023-01429',
      'CLAIM_ERRAND',
      new Date('2026-09-28T01:00:00Z'),
    )).resolves.toBeUndefined();
    expect(decisionRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'ALLOWED',
      overriddenByUserId: 'admin-1',
    }));
  });

  it('grants a bounded override and writes the grant audit entry', async () => {
    mockUserService.findById.mockResolvedValue({
      id: 'student-1',
      role: UserRole.STUDENT,
    });
    const result = await service.grantOverride({
      userId: 'student-1',
      reason: 'Approved lab event',
      durationMinutes: 45,
    }, 'admin-1');

    expect(result.userId).toBe('student-1');
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(transactionDecisionRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'OVERRIDE_GRANTED',
      overriddenByUserId: 'admin-1',
      overrideReason: 'Approved lab event',
    }));
  });
});
