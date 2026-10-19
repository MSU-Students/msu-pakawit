import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar' })
  userId!: string;

  @Column({ type: 'text', unique: true })
  endpoint!: string;

  @Column({ type: 'varchar' })
  p256dh!: string;

  @Column({ type: 'varchar' })
  auth!: string;

  @CreateDateColumn()
  createdAt!: Date;
}