import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum SyncJournalStatus {
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
  CONFLICT = 'CONFLICT',
}

@Entity('sync_journals')
export class SyncJournal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientMutationId: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column()
  action: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: SyncJournalStatus,
    default: SyncJournalStatus.APPLIED,
  })
  status: SyncJournalStatus;

  @Column({ nullable: true })
  resolutionMessage: string;

  @CreateDateColumn()
  syncedAt: Date;
}
