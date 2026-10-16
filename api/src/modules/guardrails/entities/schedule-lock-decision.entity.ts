import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

export enum ScheduleLockDecisionType {
  ALLOWED = 'ALLOWED',
  BLOCKED = 'BLOCKED',
  OVERRIDE_GRANTED = 'OVERRIDE_GRANTED',
}

@Entity('schedule_lock_decisions')
@Index(['userId', 'createdAt'])
export class ScheduleLockDecision {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'schedule_lock_decisions_user_role_enum',
  })
  userRole: UserRole;

  @Column({ length: 64 })
  activity: string;

  @Column({
    type: 'enum',
    enum: ScheduleLockDecisionType,
    enumName: 'schedule_lock_decisions_decision_enum',
  })
  decision: ScheduleLockDecisionType;

  @Column({ type: 'text' })
  reason: string;

  @Column({ nullable: true, length: 32 })
  courseCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  overriddenByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  overrideReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
