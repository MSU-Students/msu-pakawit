import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class PushSubscriptionDto {
  @IsUrl({ require_tld: false })
  endpoint: string;

  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class RemovePushSubscriptionDto {
  @IsUrl({ require_tld: false })
  endpoint: string;
}
