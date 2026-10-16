import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'One-time token from the email verification link' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  token: string;
}
