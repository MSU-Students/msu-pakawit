import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { VerifyOtpDto } from '../guardrails/dto/verify-otp.dto';
import { UpdateErrandStatusDto } from './dto/update-errand-status.dto';

@ApiTags('Dispatch & Courier Logistics (Team 2)')
@ApiBearerAuth()
@Controller('errands')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @ApiOperation({ summary: 'Create and broadcast new campus errand request' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.EMPLOYEE)
  createErrand(@Body() dto: CreateErrandDto, @Req() request: { currentUser: User }) {
    return this.dispatchService.createErrandOrder(dto, request.currentUser);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get open errand feed available for couriers' })
  findPendingErrands() {
    return this.dispatchService.findPendingErrands();
  }

  @Patch(':id/claim')
  @ApiOperation({ summary: 'Courier claims an open errand order' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  claimErrand(@Param('id') id: string, @Req() request: { currentUser: User }) {
    return this.dispatchService.claimErrand(id, request.currentUser);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance a courier-assigned errand through purchase and delivery' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateErrandStatusDto,
    @Req() request: { currentUser: User },
  ) {
    return this.dispatchService.updateErrandStatus(id, dto.status, request.currentUser);
  }

  @Get(':id/handoff/otp')
  @ApiOperation({ summary: 'Recipient retrieves the active OTP from the in-app inbox' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.EMPLOYEE)
  getRecipientOtp(@Param('id') id: string, @Req() request: { currentUser: User }) {
    return this.dispatchService.getRecipientOtp(id, request.currentUser);
  }

  @Post(':id/handoff/complete')
  @ApiOperation({ summary: 'Verify the recipient-provided OTP and complete the errand' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  completeHandoff(
    @Param('id') id: string,
    @Body() dto: VerifyOtpDto,
    @Req() request: { currentUser: User },
  ) {
    return this.dispatchService.completeHandoff(id, dto.otpCode, request.currentUser);
  }

  @Post(':id/handoff/reissue')
  @ApiOperation({ summary: 'Authorize a replacement OTP after expiry or attempt-limit lockout' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reissueHandoffOtp(@Param('id') id: string, @Req() request: { currentUser: User }) {
    return this.dispatchService.reissueHandoffOtp(id, request.currentUser);
  }
}
