import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingRegistrations1792333440000 implements MigrationInterface {
  name = 'AddPendingRegistrations1792333440000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NULL THEN
          RAISE EXCEPTION 'The users table must exist before the registration migration is run';
        END IF;
      END
      $$
    `);
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "msuIdNumber" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ALTER COLUMN "username" TYPE character varying(254)',
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email_lower" ON "users" (LOWER("email"))',
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pending_registrations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(254) NOT NULL,
        "password_hash" character varying NOT NULL,
        "full_name" character varying(120) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_sent_at" timestamptz NOT NULL,
        "resend_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_pending_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pending_registrations_email" UNIQUE ("email"),
        CONSTRAINT "UQ_pending_registrations_token_hash" UNIQUE ("token_hash")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_pending_registrations_expires_at" ON "pending_registrations" ("expires_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NOT NULL AND EXISTS (
          SELECT 1 FROM "users"
          WHERE "msuIdNumber" IS NULL OR char_length("username") > 32
        ) THEN
          RAISE EXCEPTION 'Cannot revert registration schema while users have no MSU ID or long usernames';
        END IF;
      END
      $$
    `);
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_pending_registrations_expires_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "pending_registrations"');
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_users_email_lower"');
    await queryRunner.query('ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "emailVerified"');
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "users" ALTER COLUMN "username" TYPE character varying(32)',
    );
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "users" ALTER COLUMN "msuIdNumber" SET NOT NULL',
    );
  }
}
