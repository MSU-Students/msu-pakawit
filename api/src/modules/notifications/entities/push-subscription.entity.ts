import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_subscriptions')
@Index(['endpoint'], { unique: true })
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'jsonb' })
  keys: { p256dh: string; auth: string };

  @Column({ type: 'timestamptz', nullable: true })
  expirationTime: Date | null;
}
