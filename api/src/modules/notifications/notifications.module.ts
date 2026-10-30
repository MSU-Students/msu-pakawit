import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationsController } from './notifications.controller';
import { PushNotificationsService } from './push-notifications.service';
import { SecurityModule } from '../shared/security.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PushSubscription]), SecurityModule, UserModule],
  controllers: [NotificationsController],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class NotificationsModule {}
