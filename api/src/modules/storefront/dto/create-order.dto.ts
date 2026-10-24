import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class CreateOrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(1) quantity: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'Customer Name' }) @IsString() @IsNotEmpty() customerName: string;
  @ApiProperty({ example: '09171234567' }) @IsString() @IsNotEmpty() customerPhone: string;
  @ApiProperty({ example: 'Room 12, MSU Campus, Marawi City' }) @IsString() @IsNotEmpty() deliveryAddress: string;
  @ApiProperty({ example: 'Science Complex Drop Hub' }) @IsString() @IsNotEmpty() dropZone: string;
  @ApiProperty({ type: [CreateOrderItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) totalProductCost: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) convenienceFee: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) totalAmount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() buyerStudentId?: string;
  @ApiProperty({ required: false, example: 'Leave at front desk' }) @IsOptional() @IsString() deliveryNotes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
}
