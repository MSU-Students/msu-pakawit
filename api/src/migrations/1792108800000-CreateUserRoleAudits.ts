import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRoleAudits1792108800000 implements MigrationInterface {
  name = 'CreateUserRoleAudits1792108800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_role_audits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actorUserId" uuid NOT NULL,
        "targetUserId" uuid NOT NULL,
        "oldRole" character varying(16) NOT NULL,
        "newRole" character varying(16) NOT NULL,
        "changedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_role_audits_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_role_audits_targetUserId_changedAt" ON "user_role_audits" ("targetUserId", "changedAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_audits_targetUserId_changedAt"`);
    await queryRunner.query(`DROP TABLE "user_role_audits"`);
  }
}
