import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrandOrder } from './entities/errand-order.entity';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { UserModule } from '../users/user.module';
import { GuardrailsModule } from '../guardrails/guardrails.module';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder]), UserModule, GuardrailsModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
