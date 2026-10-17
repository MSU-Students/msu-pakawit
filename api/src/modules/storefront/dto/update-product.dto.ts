import { IsArray, IsNumber, IsOptional, IsString, IsUrl, Min, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Yellow Pad Paper' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'A ruled writing pad for class notes.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['https://cdn.example.com/yellow-pad.jpg'], type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ example: 'School Supplies' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;
}