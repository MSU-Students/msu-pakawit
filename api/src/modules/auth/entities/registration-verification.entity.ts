import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../users/entities/user.entity';

@Entity('registration_verifications')
@Check('CHK_registration_verifications_role', '"role" IN (\'STUDENT\', \'EMPLOYEE\', \'COURIER\')')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['msuIdNumber'], { unique: true })
export class RegistrationVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  tokenHash: string;

  @Column({ length: 64 })
  msuIdNumber: string;

  @Column({ length: 32 })
  username: string;

  @Column({ length: 120 })
  fullName: string;

  @Column({ length: 254 })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: UserRole.STUDENT })
  role: UserRole.STUDENT | UserRole.EMPLOYEE | UserRole.COURIER;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
