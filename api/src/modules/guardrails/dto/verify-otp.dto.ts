import { IsString, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'ERR-1001', description: 'Errand order ID' })
  @IsString()
  @IsNotEmpty()
  errandId: string;

  @ApiProperty({ example: '7429', description: '4-digit OTP provided by student buyer at drop zone' })
  @IsString()
  @Length(4, 4)
  otpCode: string;
}
