import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrandOrder } from './entities/errand-order.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { NotificationModule } from './notifications/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder]), NotificationModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
