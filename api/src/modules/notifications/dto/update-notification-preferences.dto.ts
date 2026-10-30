import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  statusChanges?: boolean;

  @IsOptional()
  @IsBoolean()
  assignments?: boolean;
}
