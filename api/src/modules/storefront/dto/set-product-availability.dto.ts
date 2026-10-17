import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetProductAvailabilityDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isAvailable: boolean;
}