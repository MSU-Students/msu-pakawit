import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { DispatchService } from './dispatch.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { CompleteErrandDto } from './dto/complete-errand.dto';
import { ErrandOrderStatus } from './entities/errand-order.entity';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

type RoleRequest = Request & { currentUser: User };

@ApiTags('Dispatch & Courier Logistics (Team 2)')
@Controller('errands')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Create and broadcast new campus errand request' })
  createErrand(@Req() request: RoleRequest, @Body() dto: CreateErrandDto) {
    return this.dispatchService.createErrandOrder(
      dto,
      request.currentUser.msuIdNumber,
      request.currentUser.id,
    );
  }

  @Get('feed')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Get open errand feed available for couriers' })
  findPendingErrands(@Req() request: RoleRequest) {
    return this.dispatchService.findPendingErrands(request.currentUser.id, request.currentUser.msuIdNumber);
  }

  @Patch(':id/claim')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Courier claims an open errand order' })
  claimErrand(@Param('id') id: string, @Req() request: RoleRequest) {
    return this.dispatchService.claimErrand(id, {
      runnerStudentId: request.currentUser.msuIdNumber,
    }, request.currentUser.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Update errand delivery lifecycle status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ErrandOrderStatus,
    @Req() request: RoleRequest,
  ) {
    return this.dispatchService.updateErrandStatus(
      id,
      status,
      request.currentUser.msuIdNumber,
      request.currentUser.id,
    );
  }

  @Post(':id/handoff-otp')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Send or resend the handoff code to the buyer for an in-transit errand' })
  resendHandoffOtp(@Param('id') id: string, @Req() request: RoleRequest) {
    return this.dispatchService.resendHandoffOtp(
      id,
      request.currentUser.msuIdNumber,
      request.currentUser.id,
    );
  }

  @Post(':id/complete')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Complete an errand after verifying the buyer handoff code' })
  completeErrand(
    @Param('id') id: string,
    @Body() dto: CompleteErrandDto,
    @Req() request: RoleRequest,
  ) {
    return this.dispatchService.completeErrandWithOtp(
      id,
      dto.otpCode,
      request.currentUser.msuIdNumber,
      request.currentUser.id,
    );
  }
}
