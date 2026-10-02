import { IsArray, ValidateNested, IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncBatchItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  id?: number;

  @ApiProperty({ example: 'ERRAND_ORDER' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: 'ERR-1001' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'CREATE' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: { totalAmount: 135 } })
  @IsObject()
  payload: Record<string, any>;
}

export class SyncBatchDto {
  @ApiProperty({ type: [SyncBatchItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchItemDto)
  batch: SyncBatchItemDto[];
}
