import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'School Supplies' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}