import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingRole1792336500000 implements MigrationInterface {
  name = 'AddOnboardingRole1792336500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.users') IS NULL OR to_regclass('public.pending_registrations') IS NULL THEN
          RAISE EXCEPTION 'Run the pending registration migration before adding onboarding roles';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pending_registrations_role_enum') THEN
          CREATE TYPE "pending_registrations_role_enum" AS ENUM ('STUDENT', 'EMPLOYEE', 'COURIER');
        END IF;
      END
      $$
    `);
    await queryRunner.query(
      'ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "role" "pending_registrations_role_enum"',
    );
    await queryRunner.query(
      'UPDATE "pending_registrations" SET "role" = \'STUDENT\' WHERE "role" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "pending_registrations" ALTER COLUMN "role" SET NOT NULL',
    );
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "users" WHERE "role" IS NULL) THEN
          RAISE EXCEPTION 'Cannot revert onboarding role migration while users have no role';
        END IF;
      END
      $$
    `);
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT \'STUDENT\'');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL');
    await queryRunner.query('ALTER TABLE "pending_registrations" DROP COLUMN IF EXISTS "role"');
    await queryRunner.query('DROP TYPE IF EXISTS "pending_registrations_role_enum"');
  }
}
