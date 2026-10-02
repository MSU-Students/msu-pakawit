import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyncService } from '../modules/sync/sync.service';
import { SyncJournal, SyncJournalStatus } from '../modules/sync/entities/sync-journal.entity';

describe('SyncService (Offline Reconciliation & Journaling)', () => {
  let service: SyncService;
  let mockJournalRepo: any;

  beforeEach(async () => {
    mockJournalRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'journal-uuid' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: getRepositoryToken(SyncJournal),
          useValue: mockJournalRepo,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('should process a batch of offline outbox mutations into the journal', async () => {
    const batchDto = {
      batch: [
        {
          id: 1,
          entityType: 'ERRAND_ORDER',
          entityId: 'ERR-1001',
          action: 'CREATE',
          payload: { totalAmount: 135 },
        },
      ],
    };

    const result = await service.processBatchSync(batchDto);
    expect(result.syncedCount).toBe(1);
    expect(result.results[0].status).toBe('SYNCED');
    expect(result.results[0].entityId).toBe('ERR-1001');
  });
});
