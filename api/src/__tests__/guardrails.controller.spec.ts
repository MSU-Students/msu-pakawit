import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GuardrailsController } from '../modules/guardrails/guardrails.controller';
import { ROLES_KEY } from '../modules/users/roles.decorator';
import { UserRole } from '../modules/users/entities/user.entity';
import { JwtAuthGuard } from '../modules/shared/security/jwt-auth.guard';
import { ActiveUserGuard } from '../modules/users/active-user.guard';
import { RolesGuard } from '../modules/users/roles.guard';

describe('GuardrailsController access', () => {
  it('restricts schedule checks to active authenticated users', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, GuardrailsController.prototype.checkSchedule))
      .toEqual([JwtAuthGuard, ActiveUserGuard]);
  });

  it('restricts override grants and audit history to administrators', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, GuardrailsController.prototype.grantScheduleOverride))
      .toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, GuardrailsController.prototype.grantScheduleOverride))
      .toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(GUARDS_METADATA, GuardrailsController.prototype.getScheduleDecisionHistory))
      .toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, GuardrailsController.prototype.getScheduleDecisionHistory))
      .toEqual([UserRole.ADMIN]);
  });
});
