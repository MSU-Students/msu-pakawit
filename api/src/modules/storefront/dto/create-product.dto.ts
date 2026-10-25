import { IsString, IsNotEmpty, IsNumber, Min, IsArray, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Yellow Pad Paper' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'A ruled writing pad for class notes.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['https://cdn.example.com/yellow-pad.jpg'], type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ example: 'School Supplies' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 45.0, description: 'Price directly from the physical vendor' })
  @IsNumber()
  @Min(0)
  basePrice: number;
}
