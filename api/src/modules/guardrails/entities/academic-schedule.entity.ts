import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('academic_schedules')
export class AcademicSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.academicSchedules, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  courseCode: string; // e.g. 'CS121'

  @Column()
  courseTitle: string; // e.g. 'Data Structures and Algorithms'

  @Column({ type: 'int' })
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @Column({ length: 5 })
  startTime: string; // '08:30'

  @Column({ length: 5 })
  endTime: string; // '10:00'

  @Column()
  room: string; // 'Science Complex Lab 2'

  @Column({ default: true })
  isLocked: boolean; // Enables academic time-lock lockout

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
