import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AcademicSchedule } from './academic-schedule.entity';

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
  msuIdNumber: string; // e.g., '2023-01429'

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string; // e.g. 'amina.radiamoda@msumain.edu.ph'

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
