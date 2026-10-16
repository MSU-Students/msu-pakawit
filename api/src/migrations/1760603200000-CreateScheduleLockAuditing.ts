import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduleLockAuditing1760603200000 implements MigrationInterface {
  name = 'CreateScheduleLockAuditing1760603200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "schedule_lock_decisions_user_role_enum"
      AS ENUM ('STUDENT', 'EMPLOYEE', 'COURIER', 'ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE "schedule_lock_decisions_decision_enum"
      AS ENUM ('ALLOWED', 'BLOCKED', 'OVERRIDE_GRANTED')
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_lock_decisions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "userRole" "schedule_lock_decisions_user_role_enum" NOT NULL,
        "activity" character varying(64) NOT NULL,
        "decision" "schedule_lock_decisions_decision_enum" NOT NULL,
        "reason" text NOT NULL,
        "courseCode" character varying(32),
        "overriddenByUserId" uuid,
        "overrideReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule_lock_decisions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedule_lock_decisions_user_created"
      ON "schedule_lock_decisions" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE TABLE "schedule_lock_overrides" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "grantedByUserId" uuid NOT NULL,
        "reason" text NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedule_lock_overrides" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_schedule_lock_overrides_user_expires"
      ON "schedule_lock_overrides" ("userId", "expiresAt")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_schedule_lock_overrides_user_expires"');
    await queryRunner.query('DROP TABLE "schedule_lock_overrides"');
    await queryRunner.query('DROP INDEX "IDX_schedule_lock_decisions_user_created"');
    await queryRunner.query('DROP TABLE "schedule_lock_decisions"');
    await queryRunner.query('DROP TYPE "schedule_lock_decisions_decision_enum"');
    await queryRunner.query('DROP TYPE "schedule_lock_decisions_user_role_enum"');
  }
}
