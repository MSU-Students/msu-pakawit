import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrandOrder } from './entities/errand-order.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityModule } from '../shared/security.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder, User]), NotificationsModule, SecurityModule, UserModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
