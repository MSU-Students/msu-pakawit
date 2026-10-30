import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { NotificationService } from './notification.service';
import { PushSubscriptionEntity } from './push-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PushSubscriptionEntity, NotificationPreferenceEntity]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}