import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpHandoffProof1760603600000 implements MigrationInterface {
  name = 'AddOtpHandoffProof1760603600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "otp_logs"
      SET "status" = 'EXPIRED', "expiresAt" = now()
      WHERE "status" = 'GENERATED'
    `);
    await queryRunner.query('ALTER TABLE "otp_logs" RENAME COLUMN "otpCode" TO "otpHash"');
    await queryRunner.query('ALTER TABLE "otp_logs" ALTER COLUMN "otpHash" TYPE character varying(64)');
    await queryRunner.query(`
      ALTER TABLE "otp_logs" ALTER COLUMN "expiresAt" TYPE TIMESTAMP WITH TIME ZONE
      USING "expiresAt" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query('ALTER TABLE "otp_logs" ADD "verifiedAt" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query('ALTER TABLE "otp_logs" ADD "verifiedByUserId" uuid');

    await queryRunner.query(`
      CREATE TYPE "otp_attempt_logs_result_enum"
      AS ENUM ('INVALID', 'EXPIRED', 'LOCKED', 'VERIFIED')
    `);
    await queryRunner.query(`
      CREATE TABLE "otp_attempt_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "otpLogId" uuid NOT NULL,
        "errandId" character varying NOT NULL,
        "attemptedByUserId" uuid NOT NULL,
        "attemptNumber" integer NOT NULL,
        "result" "otp_attempt_logs_result_enum" NOT NULL,
        "attemptedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_attempt_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_otp_attempt_logs_otp_log" FOREIGN KEY ("otpLogId")
          REFERENCES "otp_logs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_otp_attempt_logs_user" FOREIGN KEY ("attemptedByUserId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_attempt_logs_errand_attempted"
      ON "otp_attempt_logs" ("errandId", "attemptedAt")
    `);

    await queryRunner.query('ALTER TABLE "errand_orders" ADD "deliveryOtpLogId" uuid');
    await queryRunner.query('ALTER TABLE "errand_orders" ADD "deliveryCompletedAt" TIMESTAMP WITH TIME ZONE');
    await queryRunner.query(`
      ALTER TABLE "errand_orders"
      ADD CONSTRAINT "FK_errand_orders_delivery_otp"
      FOREIGN KEY ("deliveryOtpLogId") REFERENCES "otp_logs"("id") ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "errand_orders" DROP CONSTRAINT "FK_errand_orders_delivery_otp"');
    await queryRunner.query('ALTER TABLE "errand_orders" DROP COLUMN "deliveryCompletedAt"');
    await queryRunner.query('ALTER TABLE "errand_orders" DROP COLUMN "deliveryOtpLogId"');
    await queryRunner.query('DROP INDEX "IDX_otp_attempt_logs_errand_attempted"');
    await queryRunner.query('DROP TABLE "otp_attempt_logs"');
    await queryRunner.query('DROP TYPE "otp_attempt_logs_result_enum"');
    await queryRunner.query(`
      UPDATE "otp_logs"
      SET "status" = 'FAILED', "otpHash" = '0000'
    `);
    await queryRunner.query('ALTER TABLE "otp_logs" DROP COLUMN "verifiedByUserId"');
    await queryRunner.query('ALTER TABLE "otp_logs" DROP COLUMN "verifiedAt"');
    await queryRunner.query(`
      ALTER TABLE "otp_logs" ALTER COLUMN "expiresAt" TYPE TIMESTAMP
      USING "expiresAt" AT TIME ZONE 'UTC'
    `);
    await queryRunner.query('ALTER TABLE "otp_logs" RENAME COLUMN "otpHash" TO "otpCode"');
    await queryRunner.query('ALTER TABLE "otp_logs" ALTER COLUMN "otpCode" TYPE character varying(4)');
  }
}
