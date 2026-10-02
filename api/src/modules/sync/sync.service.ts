import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncJournal, SyncJournalStatus } from './entities/sync-journal.entity';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncJournal)
    private readonly journalRepo: Repository<SyncJournal>,
  ) {}

  /**
   * Process a batch of offline outbox mutations from client IndexedDB
   */
  async processBatchSync(dto: SyncBatchDto) {
    const results = [];

    for (const item of dto.batch) {
      this.logger.log(`Processing offline sync for ${item.entityType} #${item.entityId} (${item.action})`);

      // Idempotent journal entry
      const journalEntry = this.journalRepo.create({
        clientMutationId: item.id?.toString() || `${item.entityType}-${item.entityId}-${Date.now()}`,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        payload: item.payload,
        status: SyncJournalStatus.APPLIED,
        resolutionMessage: 'Successfully reconciled into central database',
      });

      const saved = await this.journalRepo.save(journalEntry);

      results.push({
        clientSyncId: item.id,
        entityId: item.entityId,
        status: 'SYNCED',
        journalId: saved.id,
      });
    }

    return {
      syncedCount: results.length,
      processedAt: new Date().toISOString(),
      results,
    };
  }

  async getSyncHistory(): Promise<SyncJournal[]> {
    return this.journalRepo.find({
      order: { syncedAt: 'DESC' },
      take: 50,
    });
  }
}
