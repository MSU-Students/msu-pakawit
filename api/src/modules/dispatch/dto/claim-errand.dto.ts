import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimErrandDto {
  @ApiProperty({ example: '2023-08888', description: 'MSU Student ID of claiming courier' })
  @IsString()
  @IsNotEmpty()
  runnerStudentId: string;

  @ApiProperty({
    example: 134.0,
    description: 'Cash on delivery amount collected by the claiming courier',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  collectedCodAmount: number;
}
