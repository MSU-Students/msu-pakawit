import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ example: 'Amina Campus Supplies' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Curated stationery and dorm snacks' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Commercial Center' })
  @IsString()
  @IsNotEmpty()
  vendorOrigin: string;

  @ApiProperty({ example: 35.0 })
  @IsNumber()
  @Min(0)
  defaultConvenienceFee: number;

  @ApiProperty({ example: 10.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  markupPercentage: number;
}
