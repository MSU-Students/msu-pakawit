import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ minLength: 40, maxLength: 64 })
  @IsString()
  @MinLength(40)
  @MaxLength(64)
  token: string;
}
