import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_PATTERN } from './create-user.dto';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'amina.radiamoda' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsString()
  @Matches(USERNAME_PATTERN)
  username?: string;

  @ApiPropertyOptional({ example: 'Amina Radiamoda' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: 'amina@msumain.edu.ph' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}