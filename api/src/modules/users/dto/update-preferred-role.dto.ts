import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SelectableRole } from '../entities/user.entity';

export class UpdatePreferredRoleDto {
  @ApiProperty({ enum: SelectableRole })
  @IsEnum(SelectableRole)
  preferredRole: SelectableRole;
}
