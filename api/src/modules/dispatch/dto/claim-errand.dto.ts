import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimErrandDto {
  @ApiProperty({ example: '2023-08888', description: 'MSU Student ID of claiming courier' })
  @IsString()
  @IsNotEmpty()
  runnerStudentId: string;
}
