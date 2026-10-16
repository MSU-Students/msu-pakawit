import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DispatchController } from '../modules/dispatch/dispatch.controller';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ROLES_KEY } from '../modules/users/roles.decorator';
import { UserRole } from '../modules/users/entities/user.entity';
import { JwtAuthGuard } from '../modules/shared/security/jwt-auth.guard';
import { RolesGuard } from '../modules/users/roles.guard';

describe('DispatchController role access', () => {
  const dispatchService = {
    createErrandOrder: jest.fn(),
    findPendingErrands: jest.fn(),
    claimErrand: jest.fn(),
    updateErrandStatus: jest.fn(),
    resendHandoffOtp: jest.fn(),
    completeErrandWithOtp: jest.fn(),
  };
  const controller = new DispatchController(dispatchService as unknown as DispatchService);

  beforeEach(() => jest.clearAllMocks());

  it('requires authentication and authorizes the current database role per operation', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, DispatchController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.createErrand)).toEqual([
      UserRole.STUDENT,
      UserRole.EMPLOYEE,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.findPendingErrands)).toEqual([UserRole.COURIER]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.claimErrand)).toEqual([UserRole.COURIER]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.updateStatus)).toEqual([UserRole.COURIER]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.resendHandoffOtp)).toEqual([UserRole.COURIER]);
    expect(Reflect.getMetadata(ROLES_KEY, DispatchController.prototype.completeErrand)).toEqual([UserRole.COURIER]);
  });

  it('uses the authenticated member ID instead of submitted buyer or courier IDs', () => {
    const currentUser = { id: 'user-1', msuIdNumber: '2026-01429' };
    const request = { currentUser } as any;
    const createDto = { storeId: 'store-1' } as any;
    const claimSpy = dispatchService.claimErrand.mockReturnValue('claimed');
    const statusSpy = dispatchService.updateErrandStatus.mockReturnValue('updated');
    const createSpy = dispatchService.createErrandOrder.mockReturnValue('created');
    const completeSpy = dispatchService.completeErrandWithOtp.mockReturnValue('completed');

    controller.createErrand(request, createDto);
    controller.claimErrand('errand-1', request);
    controller.updateStatus('errand-1', 'DELIVERING' as any, request);
    controller.completeErrand('errand-1', { otpCode: '7429' }, request);

    expect(createSpy).toHaveBeenCalledWith(createDto, currentUser.msuIdNumber, currentUser.id);
    expect(claimSpy).toHaveBeenCalledWith('errand-1', { runnerStudentId: currentUser.msuIdNumber }, currentUser.id);
    expect(statusSpy).toHaveBeenCalledWith('errand-1', 'DELIVERING', currentUser.msuIdNumber, currentUser.id);
    expect(completeSpy).toHaveBeenCalledWith('errand-1', '7429', currentUser.msuIdNumber, currentUser.id);
  });
});
