import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SelectableRole } from '../entities/user.entity';
import { USERNAME_PATTERN } from './create-user.dto';

export class RegisterUserDto {
  @ApiProperty({ example: '2026-01429' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  msuIdNumber: string;

  @ApiProperty({ example: 'amina.radiamoda' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(USERNAME_PATTERN)
  username: string;

  @ApiProperty({ example: 'Amina Radiamoda' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: 'amina@msumain.edu.ph' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: SelectableRole })
  @IsEnum(SelectableRole, { message: 'Role must be STUDENT, EMPLOYEE, or COURIER' })
  role: SelectableRole;
}
