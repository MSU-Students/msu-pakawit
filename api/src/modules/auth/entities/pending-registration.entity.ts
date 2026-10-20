import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

@Entity('pending_registrations')
@Unique('UQ_pending_registrations_email', ['email'])
@Unique('UQ_pending_registrations_token_hash', ['tokenHash'])
export class PendingRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 254 })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: [UserRole.STUDENT, UserRole.EMPLOYEE, UserRole.COURIER],
    enumName: 'pending_registrations_role_enum',
    nullable: true,
  })
  role: UserRole | null;

  @Column({ name: 'token_hash', length: 64, select: false })
  tokenHash: string;

  @Index('IDX_pending_registrations_expires_at')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_sent_at', type: 'timestamptz' })
  lastSentAt: Date;

  @Column({ name: 'resend_count', type: 'integer', default: 0 })
  resendCount: number;
}
