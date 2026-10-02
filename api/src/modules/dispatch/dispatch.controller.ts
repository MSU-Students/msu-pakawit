import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { ErrandOrderStatus } from './entities/errand-order.entity';

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
