import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1792675000000 implements MigrationInterface {
  name = 'CreateInitialSchema1792675000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('STUDENT', 'EMPLOYEE', 'COURIER', 'ADMIN')
    `);
    await queryRunner.query(`
      CREATE TYPE "errand_orders_status_enum" AS ENUM (
        'PENDING', 'ACCEPTED', 'PURCHASED', 'DELIVERING', 'COMPLETED', 'CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "otp_logs_status_enum" AS ENUM ('GENERATED', 'VERIFIED', 'EXPIRED', 'FAILED')
    `);
    await queryRunner.query(`
      CREATE TYPE "sync_journals_status_enum" AS ENUM ('APPLIED', 'REJECTED', 'CONFLICT')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "msuIdNumber" character varying NOT NULL,
        "username" character varying(32) NOT NULL,
        "passwordHash" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'STUDENT',
        "isCourierVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_msuIdNumber" UNIQUE ("msuIdNumber"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "stores" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "hostStudentId" character varying NOT NULL,
        "hostName" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "vendorOrigin" character varying NOT NULL,
        "defaultConvenienceFee" numeric(10, 2) NOT NULL DEFAULT 35.00,
        "markupPercentage" numeric(5, 2) NOT NULL DEFAULT 10.00,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "storeId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "category" character varying NOT NULL,
        "basePrice" numeric(10, 2) NOT NULL,
        "markupPrice" numeric(10, 2) NOT NULL,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_storeId" FOREIGN KEY ("storeId")
          REFERENCES "stores"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "errand_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "buyerStudentId" character varying NOT NULL,
        "runnerStudentId" character varying,
        "storeId" character varying NOT NULL,
        "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "totalProductCost" numeric(10, 2) NOT NULL,
        "convenienceFee" numeric(10, 2) NOT NULL,
        "totalAmount" numeric(10, 2) NOT NULL,
        "dropZone" character varying NOT NULL,
        "status" "errand_orders_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_errand_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "academic_schedules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "courseCode" character varying NOT NULL,
        "courseTitle" character varying NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "startTime" character varying(5) NOT NULL,
        "endTime" character varying(5) NOT NULL,
        "room" character varying NOT NULL,
        "isLocked" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_academic_schedules_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_academic_schedules_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "otp_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "errandId" character varying NOT NULL,
        "otpCode" character varying(4) NOT NULL,
        "status" "otp_logs_status_enum" NOT NULL DEFAULT 'GENERATED',
        "attempts" integer NOT NULL DEFAULT 0,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sync_journals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clientMutationId" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "sync_journals_status_enum" NOT NULL DEFAULT 'APPLIED',
        "resolutionMessage" character varying,
        "syncedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sync_journals_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    throw new Error(
      'The initial schema migration cannot be reverted automatically because it would drop application data.',
    );
  }
}
