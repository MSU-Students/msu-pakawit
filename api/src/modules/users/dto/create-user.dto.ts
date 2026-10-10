import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export class CreateUserDto {
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

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.STUDENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}