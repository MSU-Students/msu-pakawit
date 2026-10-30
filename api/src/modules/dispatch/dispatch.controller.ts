import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { DispatchService } from './dispatch.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { ErrandOrderStatus } from './entities/errand-order.entity';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { AuthUser } from '../shared/security/auth-user';
import { ActiveUserGuard } from '../users/active-user.guard';

type AuthenticatedRequest = Request & { user: AuthUser };

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

  @Get(':id')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an errand detail for its buyer or assigned courier' })
  findErrand(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.dispatchService.findErrandForUser(id, request.user.sub);
  }

  @Patch(':id/claim')
  @ApiOperation({ summary: 'Courier claims an open errand order' })
  claimErrand(@Param('id') id: string, @Body() dto: ClaimErrandDto) {
    return this.dispatchService.claimErrand(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update errand delivery lifecycle status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ErrandOrderStatus,
  ) {
    return this.dispatchService.updateErrandStatus(id, status);
  }
}
