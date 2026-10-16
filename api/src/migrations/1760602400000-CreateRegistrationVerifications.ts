import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRegistrationVerifications1760602400000 implements MigrationInterface {
  name = 'CreateRegistrationVerifications1760602400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "registration_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tokenHash" character varying(64) NOT NULL,
        "msuIdNumber" character varying(64) NOT NULL,
        "username" character varying(32) NOT NULL,
        "fullName" character varying(120) NOT NULL,
        "email" character varying(254) NOT NULL,
        "passwordHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_registration_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_registration_verifications_token_hash" UNIQUE ("tokenHash"),
        CONSTRAINT "UQ_registration_verifications_msu_id" UNIQUE ("msuIdNumber"),
        CONSTRAINT "UQ_registration_verifications_username" UNIQUE ("username"),
        CONSTRAINT "UQ_registration_verifications_email" UNIQUE ("email")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "registration_verifications"');
  }
}
