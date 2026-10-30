import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user.entity';

@Entity('user_role_audits')
@Index('IDX_user_role_audits_targetUserId_changedAt', ['targetUserId', 'changedAt'])
export class UserRoleAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  actorUserId: string;

  @Column('uuid')
  targetUserId: string;

  @Column({ type: 'varchar', length: 16 })
  oldRole: UserRole;

  @Column({ type: 'varchar', length: 16 })
  newRole: UserRole;

  @CreateDateColumn()
  changedAt: Date;
}
