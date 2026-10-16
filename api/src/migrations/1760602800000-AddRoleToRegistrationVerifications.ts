import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToRegistrationVerifications1760602800000 implements MigrationInterface {
  name = 'AddRoleToRegistrationVerifications1760602800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "registration_verifications"
      ADD "role" character varying(16) NOT NULL DEFAULT 'STUDENT'
    `);
    await queryRunner.query(`
      ALTER TABLE "registration_verifications"
      ADD CONSTRAINT "CHK_registration_verifications_role"
      CHECK ("role" IN ('STUDENT', 'EMPLOYEE', 'COURIER'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "registration_verifications"
      DROP CONSTRAINT "CHK_registration_verifications_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "registration_verifications"
      DROP COLUMN "role"
    `);
  }
}
