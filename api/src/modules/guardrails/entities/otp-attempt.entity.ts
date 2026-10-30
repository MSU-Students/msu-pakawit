import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_attempts')
export class OTPAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  errandId: string;

  @Column({ type: 'uuid', nullable: true })
  otpLogId: string | null;

  @Column()
  actorStudentId: string;

  @Column({ type: 'varchar', length: 32 })
  result: string;

  @CreateDateColumn()
  attemptedAt: Date;
}
