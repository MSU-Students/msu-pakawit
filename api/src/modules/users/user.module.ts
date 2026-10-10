import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { SecurityModule } from '../shared/security.module';
import { RolesGuard } from './roles.guard';
import { UserController } from './user.controller';
import { ActiveUserGuard } from './active-user.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SecurityModule],
  controllers: [UserController],
  providers: [UserService, RolesGuard, ActiveUserGuard],
  exports: [UserService, RolesGuard, ActiveUserGuard, SecurityModule],
})
export class UserModule {}