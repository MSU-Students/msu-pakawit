import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AcademicSchedule } from '../../guardrails/entities/academic-schedule.entity';

export enum UserRole {
  STUDENT = 'STUDENT',
  EMPLOYEE = 'EMPLOYEE',
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
}

export enum SelectableRole {
  STUDENT = 'STUDENT',
  EMPLOYEE = 'EMPLOYEE',
  COURIER = 'COURIER',
}

export const SELECTABLE_ROLES = Object.values(SelectableRole);

export const isSelectableRole = (role: unknown): role is SelectableRole =>
  typeof role === 'string' && (SELECTABLE_ROLES as string[]).includes(role);

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  msuIdNumber: string;

  @Column({ unique: true, length: 32 })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    length: 16,
    default: SelectableRole.STUDENT,
  })
  preferredRole: SelectableRole;

  @Column({ default: false })
  isCourierVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => AcademicSchedule, (schedule) => schedule.user)
  academicSchedules: AcademicSchedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
