import type {
  Order,
  OrderFormErrors,
  OrderFormValues,
  OrderProduct,
} from './orderTypes';

const PH_MOBILE = /^(\+63|0)9\d{9}$/;

const newId = (): string => {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `ERR-${raw.slice(0, 8).toUpperCase()}`;
};

export const validateOrderForm = (values: OrderFormValues): OrderFormErrors => {
  const errors: OrderFormErrors = {};

  if (values.buyerName.trim().length < 2) {
    errors.buyerName = 'Enter your full name.';
  }
  if (!PH_MOBILE.test(values.contactNumber.trim())) {
    errors.contactNumber = 'Enter a mobile number like 09123456789.';
  }
  if (values.deliveryAddress.trim().length < 3) {
    errors.deliveryAddress = 'Enter where the order should be delivered.';
  }
  const hasItem = Object.values(values.quantities).some((q) => q > 0);
  if (!hasItem) {
    errors.items = 'Select at least one product.';
  }
  return errors;
};

export const buildOrder = (
  store: { id: string; name: string },
  products: OrderProduct[],
  values: OrderFormValues,
  convenienceFee: number,
): Order => {
  const items = products
    .filter((p) => (values.quantities[p.id] ?? 0) > 0)
    .map((p) => ({
      productId: p.id,
      name: p.name,
      unitPrice: p.price,
      quantity: values.quantities[p.id],
    }));

  const totalProductCost = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    storeId: store.id,
    storeName: store.name,
    buyerName: values.buyerName.trim(),
    contactNumber: values.contactNumber.trim(),
    deliveryAddress: values.deliveryAddress.trim(),
    items,
    totalProductCost,
    convenienceFee,
    totalAmount: totalProductCost + convenienceFee,
  };
};

export interface CustomerDetails {
  buyerName: string;
  contactNumber: string;
}

export interface CartPricing {
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number;
}

export const validateCustomerDetails = (d: CustomerDetails): OrderFormErrors => {
  const errors: OrderFormErrors = {};
  if (d.buyerName.trim().length < 2) {
    errors.buyerName = 'Enter your full name.';
  }
  if (!PH_MOBILE.test(d.contactNumber.trim())) {
    errors.contactNumber = 'Enter a valid mobile number(11 digits).';
  }
  return errors;
};

export const buildOrderFromCart = (
  store: { id: string; name: string },
  items: OrderItem[],
  pricing: CartPricing,
  deliveryAddress: string,
  customer: CustomerDetails,
): Order => ({
  id: newId(),
  createdAt: new Date().toISOString(),
  status: 'PENDING',
  storeId: store.id,
  storeName: store.name,
  buyerName: customer.buyerName.trim(),
  contactNumber: customer.contactNumber.trim(),
  deliveryAddress,
  items,
  totalProductCost: pricing.totalProductCost,
  convenienceFee: pricing.convenienceFee,
  totalAmount: pricing.totalAmount,
});