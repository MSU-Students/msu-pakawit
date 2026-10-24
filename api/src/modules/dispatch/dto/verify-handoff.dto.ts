import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyHandoffDto {
  @ApiProperty({ example: '7429', description: '4-digit code provided by the recipient' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  otpCode: string;
}
