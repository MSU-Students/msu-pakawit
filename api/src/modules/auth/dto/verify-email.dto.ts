import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'The one-time token from the verification email' })
  @IsString()
  @Length(64, 64)
  @Matches(/^[a-f0-9]{64}$/i)
  token: string;
}
