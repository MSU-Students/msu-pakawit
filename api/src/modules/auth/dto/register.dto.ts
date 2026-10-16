import { OmitType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {
  @ApiProperty({ enum: [UserRole.STUDENT, UserRole.EMPLOYEE, UserRole.COURIER] })
  @IsIn([UserRole.STUDENT, UserRole.EMPLOYEE, UserRole.COURIER])
  role: UserRole.STUDENT | UserRole.EMPLOYEE | UserRole.COURIER;
}
