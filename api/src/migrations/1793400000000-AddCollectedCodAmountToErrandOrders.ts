import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollectedCodAmountToErrandOrders1793400000000
  implements MigrationInterface
{
  name = 'AddCollectedCodAmountToErrandOrders1793400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "errand_orders" ADD COLUMN "collectedCodAmount" numeric(10,2)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "errand_orders" DROP COLUMN "collectedCodAmount"',
    );
  }
}
