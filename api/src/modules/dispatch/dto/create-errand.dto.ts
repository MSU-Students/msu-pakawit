import { IsString, IsNotEmpty, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateErrandDto {
  @ApiProperty({ example: '2023-01429' })
  @IsString()
  @IsNotEmpty()
  buyerStudentId: string;

  @ApiProperty({ example: 'store-uuid' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ example: [{ productId: 'p1', name: 'Yellow Pad', quantity: 2, unitPrice: 49.5 }] })
  @IsArray()
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;

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
