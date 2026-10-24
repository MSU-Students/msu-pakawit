import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { DispatchService } from './dispatch.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { VerifyHandoffDto } from './dto/verify-handoff.dto';
import { ErrandOrderStatus } from './entities/errand-order.entity';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { ActiveUserGuard } from '../users/active-user.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';

type CurrentUserRequest = Request & { currentUser: User };

@ApiTags('Dispatch & Courier Logistics (Team 2)')
@Controller('errands')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  @ApiOperation({ summary: 'Create and broadcast new campus errand request' })
  createErrand(@Body() dto: CreateErrandDto) {
    return this.dispatchService.createErrandOrder(dto);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get open errand feed available for couriers' })
  findPendingErrands() {
    return this.dispatchService.findPendingErrands();
  }

  @Patch(':id/claim')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Courier claims an open errand order' })
  claimErrand(@Param('id') id: string, @Req() request: CurrentUserRequest) {
    return this.dispatchService.claimErrand(id, request.currentUser.msuIdNumber);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update errand delivery lifecycle status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ErrandOrderStatus,
  ) {
    return this.dispatchService.updateErrandStatus(id, status);
  }

  @Post(':id/handoff-otp')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a handoff OTP for delivery to the recipient through the app' })
  generateHandoffOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: CurrentUserRequest,
  ) {
    return this.dispatchService.generateHandoffOtp(id, request.currentUser.msuIdNumber);
  }

  @Post(':id/verify-handoff')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(UserRole.COURIER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify recipient handoff and complete the errand atomically' })
  verifyHandoff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyHandoffDto,
    @Req() request: CurrentUserRequest,
  ) {
    return this.dispatchService.verifyHandoff(
      id,
      dto.otpCode,
      request.currentUser.msuIdNumber,
    );
  }
}
