import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CompleteErrandDto {
  @ApiProperty({ example: '7429', description: 'Four-digit code delivered to the buyer' })
  @IsString()
  @Matches(/^\d{4}$/)
  otpCode: string;
}
