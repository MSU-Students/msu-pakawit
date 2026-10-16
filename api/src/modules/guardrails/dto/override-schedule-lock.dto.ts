import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Max, Min, MinLength, MaxLength } from 'class-validator';

export class OverrideScheduleLockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ minLength: 8, maxLength: 500 })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason: string;

  @ApiProperty({ description: 'Override lifetime in minutes, up to 120' })
  @IsInt()
  @Min(1)
  @Max(120)
  durationMinutes: number;
}
