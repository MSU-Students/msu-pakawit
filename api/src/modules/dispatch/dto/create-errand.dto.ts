import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrandItemDto {
  @ApiProperty({ example: 'p1' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'Yellow Pad' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 49.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

export class CreateErrandDto {
  @ApiProperty({ example: '2023-01429' })
  @IsString()
  @IsNotEmpty()
  buyerStudentId: string;

  @ApiPropertyOptional({ example: 'Juan Dela Cruz' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @ApiPropertyOptional({ example: '09171234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNumber?: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ type: [ErrandItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ErrandItemDto)
  items: ErrandItemDto[];

  @ApiProperty({ example: 99.0 })
  @IsNumber()
  @Min(0)
  totalProductCost: number;

  @ApiProperty({ example: 35.0 })
  @IsNumber()
  @Min(0)
  convenienceFee: number;

  @ApiProperty({ example: 134.0 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 'Science Complex Drop Hub' })
  @IsString()
  @IsNotEmpty()
  dropZone: string;
}