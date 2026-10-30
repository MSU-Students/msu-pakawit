import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '7429', description: '4-digit OTP provided by the recipient to the courier' })
  @IsString()
  otpCode: string;
}
