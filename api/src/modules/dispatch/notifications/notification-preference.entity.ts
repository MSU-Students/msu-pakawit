import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferenceEntity {
  @PrimaryColumn({ type: 'varchar' })
  userId!: string;

  /** Master switch. When false, no push is sent regardless of the other flags. */
  @Column({ type: 'boolean', default: true })
  pushEnabled!: boolean;

  /** Order / errand status changes. */
  @Column({ type: 'boolean', default: true })
  statusChanges!: boolean;

  /** Runner assignments. */
  @Column({ type: 'boolean', default: true })
  assignments!: boolean;

  @UpdateDateColumn()
  updatedAt!: Date;
}