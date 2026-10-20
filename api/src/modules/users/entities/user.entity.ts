import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AcademicSchedule } from '../../guardrails/entities/academic-schedule.entity';

export enum UserRole {
  STUDENT = 'STUDENT',
  EMPLOYEE = 'EMPLOYEE',
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
}

@Entity('users')
@Index('UQ_users_email_lower', { unique: true, synchronize: false })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  msuIdNumber: string | null;

  @Column({ unique: true, length: 254 })
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  emailVerified: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
  })
  role: UserRole | null;

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
