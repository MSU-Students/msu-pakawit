import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrandOrder } from './entities/errand-order.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { GuardrailsModule } from '../guardrails/guardrails.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder]), GuardrailsModule, UserModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
