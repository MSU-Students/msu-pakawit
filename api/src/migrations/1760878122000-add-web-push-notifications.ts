import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebPushNotifications1760878122000 implements MigrationInterface {
  name = 'AddWebPushNotifications1760878122000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "notifyOnErrandStatusChanges" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "notifyOnErrandAssignments" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "keys" jsonb NOT NULL,
        "expirationTime" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_subscriptions_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_push_subscriptions_endpoint"
      ON "push_subscriptions" ("endpoint")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_push_subscriptions_endpoint"');
    await queryRunner.query('DROP TABLE IF EXISTS "push_subscriptions"');
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "notifyOnErrandStatusChanges",
        DROP COLUMN IF EXISTS "notifyOnErrandAssignments"
    `);
  }
}
