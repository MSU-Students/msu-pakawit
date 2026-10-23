import { getMetadataArgsStorage } from 'typeorm';
import { ErrandOrder } from '../modules/dispatch/entities/errand-order.entity';
import { ErrandOrderItem } from '../modules/dispatch/entities/errand-order-item.entity';

describe('Errand order entity schema', () => {
  const storage = getMetadataArgsStorage();

  it('retains JSONB snapshots while adding the customer and store relationships', () => {
    const columns = storage.columns.filter((column) => column.target === ErrandOrder);
    const column = (propertyName: string) =>
      columns.find((entry) => entry.propertyName === propertyName);

    expect(column('items')?.options.type).toBe('jsonb');
    expect(column('buyerStudentId')?.options.nullable).toBe(true);
    expect(column('customerUserId')?.options.type).toBe('uuid');
    expect(column('storeUuid')?.options.type).toBe('uuid');
    expect(column('customerName')?.options.nullable).toBe(true);
    expect(column('deliveryAddress')?.options.nullable).toBe(true);

    const relations = storage.relations.filter((relation) => relation.target === ErrandOrder);
    expect(relations.map((relation) => relation.propertyName)).toEqual(
      expect.arrayContaining(['store', 'customerUser', 'lineItems']),
    );
  });

  it('models item snapshots with order/product references and database constraints', () => {
    const columns = storage.columns.filter((column) => column.target === ErrandOrderItem);
    const column = (propertyName: string) =>
      columns.find((entry) => entry.propertyName === propertyName);

    expect(column('orderId')?.options.type).toBe('uuid');
    expect(column('productId')?.options.type).toBe('uuid');
    expect(column('productId')?.options.nullable).toBe(true);
    expect(column('productName')?.options.type).toBe('text');
    expect(column('quantity')?.options.type).toBe('int');
    expect(column('unitPrice')?.options).toMatchObject({
      type: 'decimal',
      precision: 10,
      scale: 2,
    });

    const relations = storage.relations.filter((relation) => relation.target === ErrandOrderItem);
    expect(relations.map((relation) => relation.propertyName)).toEqual(
      expect.arrayContaining(['order', 'product']),
    );

    const checks = storage.checks.filter((check) => check.target === ErrandOrderItem);
    expect(checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        'CHK_errand_order_items_quantity_positive',
        'CHK_errand_order_items_unitPrice_nonnegative',
        'CHK_errand_order_items_productName_nonempty',
      ]),
    );
  });
});
