import { Logger } from '@nestjs/common';
import { PendingRegistration } from '../modules/auth/entities/pending-registration.entity';
import dataSource from '../data-source';

const logger = new Logger('PendingRegistrationCleanup');

async function cleanupExpiredRegistrations(): Promise<void> {
  await dataSource.initialize();
  try {
    const result = await dataSource
      .getRepository(PendingRegistration)
      .createQueryBuilder()
      .delete()
      .where('"expires_at" <= :now', { now: new Date() })
      .execute();
    logger.log(`Deleted ${result.affected ?? 0} expired pending registration(s)`);
  } finally {
    await dataSource.destroy();
  }
}

cleanupExpiredRegistrations().catch((error: unknown) => {
  logger.error('Expired pending registration cleanup failed', error instanceof Error ? error.stack : undefined);
  process.exitCode = 1;
});
