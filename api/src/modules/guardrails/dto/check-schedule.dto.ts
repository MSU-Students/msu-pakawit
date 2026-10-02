import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckScheduleDto {
  @ApiProperty({ example: '2023-01429', description: 'MSU Student ID Number' })
  @IsString()
  @IsNotEmpty()
  msuIdNumber: string;

  @ApiPropertyOptional({ example: '2026-09-28T09:15:00Z', description: 'ISO timestamp to evaluate against schedule' })
  @IsString()
  @IsOptional()
  timestamp?: string;
}
