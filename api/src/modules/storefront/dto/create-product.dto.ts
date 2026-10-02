import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Yellow Pad Paper' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'School Supplies' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 45.0, description: 'Price directly from the physical vendor' })
  @IsNumber()
  @Min(0)
  basePrice: number;
}
