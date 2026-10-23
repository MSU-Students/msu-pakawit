import { QueryRunner } from 'typeorm';
import { CreateInitialSchema1792675000000 } from '../migrations/1792675000000-CreateInitialSchema';
import { AddErrandOrderItems1792676000000 } from '../migrations/1792676000000-AddErrandOrderItems';

describe('Initial schema migration', () => {
  it('runs before the order extension migration', () => {
    expect(Number(CreateInitialSchema1792675000000.name.match(/\d+$/)?.[0])).toBeLessThan(
      Number(AddErrandOrderItems1792676000000.name.match(/\d+$/)?.[0]),
    );
  });

  it('creates the pre-extension schema without adding order extension columns', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as unknown as QueryRunner;

    await new CreateInitialSchema1792675000000().up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TYPE "users_role_enum"');
    expect(sql).toContain('CREATE TYPE "errand_orders_status_enum"');
    expect(sql).toContain('CREATE TYPE "otp_logs_status_enum"');
    expect(sql).toContain('CREATE TYPE "sync_journals_status_enum"');
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain('CREATE TABLE "stores"');
    expect(sql).toContain('CREATE TABLE "products"');
    expect(sql).toContain('CREATE TABLE "errand_orders"');
    expect(sql).toContain('CREATE TABLE "academic_schedules"');
    expect(sql).toContain('CREATE TABLE "otp_logs"');
    expect(sql).toContain('CREATE TABLE "sync_journals"');
    expect(sql).toContain('REFERENCES "stores"("id") ON DELETE CASCADE');
    expect(sql).toContain('REFERENCES "users"("id") ON DELETE CASCADE');
    expect(sql).toContain('"items" jsonb NOT NULL DEFAULT \'[]\'::jsonb');
    expect(sql).toContain('"status" "errand_orders_status_enum" NOT NULL DEFAULT \'PENDING\'');
    expect(sql).not.toContain('"errand_order_items"');
    expect(sql).not.toContain('"customerUserId"');
    expect(sql).not.toContain('"storeUuid"');
    expect(sql).not.toContain('"idempotencyKey"');
  });

  it('refuses an automatic rollback that would drop application data', async () => {
    const query = jest.fn();
    const queryRunner = { query } as unknown as QueryRunner;

    await expect(
      new CreateInitialSchema1792675000000().down(queryRunner),
    ).rejects.toThrow('would drop application data');
    expect(query).not.toHaveBeenCalled();
  });
});
