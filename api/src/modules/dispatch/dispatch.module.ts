import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrandOrder } from './entities/errand-order.entity';
import { ErrandOrderItem } from './entities/errand-order-item.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder, ErrandOrderItem])],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
