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
