import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';

@ApiTags('Offline Sync & Reconciliation (Team 3)')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @ApiOperation({ summary: 'Reconcile batch of offline IndexedDB outbox items' })
  processBatch(@Body() dto: SyncBatchDto) {
    return this.syncService.processBatchSync(dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get recent sync journal records' })
  getHistory() {
    return this.syncService.getSyncHistory();
  }
}
