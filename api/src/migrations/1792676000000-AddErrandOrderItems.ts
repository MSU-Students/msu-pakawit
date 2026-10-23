import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddErrandOrderItems1792676000000 implements MigrationInterface {
  name = 'AddErrandOrderItems1792676000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "errand_orders"
        ALTER COLUMN "buyerStudentId" DROP NOT NULL,
        ADD COLUMN "storeUuid" uuid,
        ADD COLUMN "customerUserId" uuid,
        ADD COLUMN "customerName" varchar(160),
        ADD COLUMN "customerEmail" varchar(254),
        ADD COLUMN "customerPhone" varchar(32),
        ADD COLUMN "deliveryAddress" text,
        ADD COLUMN "idempotencyKey" varchar(128)
    `);

    await queryRunner.query(`
      UPDATE "errand_orders" AS order_record
      SET "storeUuid" = store_record.id
      FROM "stores" AS store_record
      WHERE store_record.id::text = order_record."storeId"
    `);

    await queryRunner.query(`
      CREATE TABLE "errand_order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "orderId" uuid NOT NULL,
        "productId" uuid,
        "productName" text NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(10, 2) NOT NULL,
        CONSTRAINT "PK_errand_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_errand_order_items_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_errand_order_items_unitPrice_nonnegative" CHECK ("unitPrice" >= 0),
        CONSTRAINT "CHK_errand_order_items_productName_nonempty" CHECK (length(btrim("productName")) > 0),
        CONSTRAINT "FK_errand_order_items_orderId" FOREIGN KEY ("orderId")
          REFERENCES "errand_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_errand_order_items_productId" FOREIGN KEY ("productId")
          REFERENCES "products"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      WITH expanded_items AS (
        SELECT
          order_record.id AS "orderId",
          order_record."storeId",
          item.value AS snapshot,
          CASE
            WHEN jsonb_typeof(item.value->'quantity') = 'number'
              AND (item.value->>'quantity') ~ '^[1-9][0-9]{0,9}$'
            THEN CASE
              WHEN (item.value->>'quantity')::numeric <= 2147483647
              THEN (item.value->>'quantity')::integer
            END
          END AS quantity,
          CASE
            WHEN jsonb_typeof(item.value->'unitPrice') = 'number'
              AND (item.value->>'unitPrice') ~ '^(0|[1-9][0-9]{0,7})(\\.[0-9]{1,2})?$'
            THEN (item.value->>'unitPrice')::numeric(10, 2)
          END AS "unitPrice"
        FROM "errand_orders" AS order_record
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(order_record.items) = 'array' THEN order_record.items
            ELSE '[]'::jsonb
          END
        ) AS item(value)
      )
      INSERT INTO "errand_order_items" ("orderId", "productId", "productName", "quantity", "unitPrice")
      SELECT
        expanded_items."orderId",
        product_record.id,
        expanded_items.snapshot->>'name',
        expanded_items.quantity,
        expanded_items."unitPrice"
      FROM expanded_items
      LEFT JOIN "products" AS product_record
        ON product_record.id::text = expanded_items.snapshot->>'productId'
        AND product_record."storeId" = expanded_items."storeId"
      WHERE jsonb_typeof(expanded_items.snapshot) = 'object'
        AND jsonb_typeof(expanded_items.snapshot->'name') = 'string'
        AND length(btrim(expanded_items.snapshot->>'name')) > 0
        AND expanded_items.quantity IS NOT NULL
        AND expanded_items."unitPrice" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "errand_orders"
        ADD CONSTRAINT "FK_errand_orders_storeUuid"
          FOREIGN KEY ("storeUuid") REFERENCES "stores"("id") ON DELETE RESTRICT,
        ADD CONSTRAINT "FK_errand_orders_customerUserId"
          FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_errand_orders_status_createdAt"
        ON "errand_orders" ("status", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_errand_orders_storeUuid_createdAt"
        ON "errand_orders" ("storeUuid", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_errand_orders_customerUserId_createdAt"
        ON "errand_orders" ("customerUserId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_errand_orders_idempotencyKey"
        ON "errand_orders" ("idempotencyKey")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_errand_order_items_orderId"
        ON "errand_order_items" ("orderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_errand_order_items_productId"
        ON "errand_order_items" ("productId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "errand_order_items" AS item_record
          JOIN "errand_orders" AS order_record ON order_record.id = item_record."orderId"
          WHERE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(order_record.items) = 'array' THEN order_record.items
                ELSE '[]'::jsonb
              END
            ) AS legacy_item(value)
            WHERE legacy_item.value->>'name' = item_record."productName"
              AND legacy_item.value->>'quantity' = item_record.quantity::text
              AND jsonb_typeof(legacy_item.value->'unitPrice') = 'number'
              AND CASE
                WHEN (legacy_item.value->>'unitPrice') ~ '^(0|[1-9][0-9]{0,7})(\\.[0-9]{1,2})?$'
                THEN (legacy_item.value->>'unitPrice')::numeric = item_record."unitPrice"
                ELSE false
              END
              AND (
                item_record."productId" IS NULL
                OR legacy_item.value->>'productId' = item_record."productId"::text
              )
          )
        ) THEN
          RAISE EXCEPTION 'Cannot revert: some normalized snapshots are not preserved in the legacy JSONB items column';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "errand_orders"
          WHERE "buyerStudentId" IS NULL
        ) THEN
          RAISE EXCEPTION 'Cannot revert order migration while orders without a student ID exist';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "errand_orders"
          WHERE "storeUuid" IS NOT NULL AND "storeId" <> "storeUuid"::text
        ) THEN
          RAISE EXCEPTION 'Cannot revert order migration while a store relation cannot be represented by the legacy storeId';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "errand_orders"
          WHERE "customerUserId" IS NOT NULL
            OR "customerName" IS NOT NULL
            OR "customerEmail" IS NOT NULL
            OR "customerPhone" IS NOT NULL
            OR "deliveryAddress" IS NOT NULL
            OR "idempotencyKey" IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'Cannot revert order migration while new order data is populated';
        END IF;
      END;
      $$
    `);

    await queryRunner.query(`DROP INDEX "IDX_errand_order_items_productId"`);
    await queryRunner.query(`DROP INDEX "IDX_errand_order_items_orderId"`);
    await queryRunner.query(`DROP INDEX "UQ_errand_orders_idempotencyKey"`);
    await queryRunner.query(`DROP INDEX "IDX_errand_orders_customerUserId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_errand_orders_storeUuid_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_errand_orders_status_createdAt"`);
    await queryRunner.query(`ALTER TABLE "errand_orders" DROP CONSTRAINT "FK_errand_orders_customerUserId"`);
    await queryRunner.query(`ALTER TABLE "errand_orders" DROP CONSTRAINT "FK_errand_orders_storeUuid"`);
    await queryRunner.query(`DROP TABLE "errand_order_items"`);
    await queryRunner.query(`
      ALTER TABLE "errand_orders"
        DROP COLUMN "idempotencyKey",
        DROP COLUMN "deliveryAddress",
        DROP COLUMN "customerPhone",
        DROP COLUMN "customerEmail",
        DROP COLUMN "customerName",
        DROP COLUMN "customerUserId",
        DROP COLUMN "storeUuid",
        ALTER COLUMN "buyerStudentId" SET NOT NULL
    `);
  }
}
