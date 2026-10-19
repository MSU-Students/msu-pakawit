import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class PushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

/** Mirrors the JSON produced by `PushSubscription.toJSON()` in the browser. */
export class SubscribeDto {
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UnsubscribeDto {
  @IsUrl({ require_tld: false })
  endpoint!: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  statusChanges?: boolean;

  @IsOptional()
  @IsBoolean()
  assignments?: boolean;
}