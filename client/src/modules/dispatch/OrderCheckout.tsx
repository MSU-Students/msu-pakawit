import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { OrderReceipt } from './OrderReceipt';
import { buildOrderFromCart, validateCustomerDetails } from './createOrder';
import type { CartPricing } from './createOrder';
import type { Order, OrderFormErrors, OrderItem } from './orderTypes';

export interface OrderCheckoutProps {
  store: { id: string; name: string };
  items: OrderItem[];
  pricing: CartPricing;
  deliveryAddress: string;
  onSubmit: (order: Order) => Promise<void> | void;
  onBack: () => void;
  onDone: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-msu-maroon';

export const OrderCheckout: React.FC<OrderCheckoutProps> = ({
  store,
  items,
  pricing,
  deliveryAddress,
  onSubmit,
  onBack,
  onDone,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  if (receipt) {
    return (
      <div className="space-y-3 sticky top-20">
        <OrderReceipt order={receipt} />
        <Button variant="outline" className="w-full" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = { buyerName, contactNumber };
    const found = validateCustomerDetails(customer);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = buildOrderFromCart(store, items, pricing, deliveryAddress, customer);
      await onSubmit(order);
      setReceipt(order);
    } catch {
      setSubmitError('We could not save your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="sticky top-20 border-slate-300">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <h4 className="font-bold text-slate-900">Confirm your order</h4>

        <ul className="divide-y divide-slate-100 text-xs border-y border-slate-100">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between py-1.5">
              <span>{i.quantity} × {i.name}</span>
              <span>₱{(i.unitPrice * i.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="text-xs space-y-1 text-slate-600">
          <p className="flex justify-between">
            <span>Items</span>
            <span>₱{pricing.totalProductCost.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>Delivery fee</span>
            <span>₱{pricing.convenienceFee.toFixed(2)}</span>
          </p>
          <p className="flex justify-between font-bold text-slate-900 text-sm">
            <span>Total (COD)</span>
            <span>₱{pricing.totalAmount.toFixed(2)}</span>
          </p>
        </div>

        <p className="text-xs text-slate-700">
          <strong>Deliver to:</strong> {deliveryAddress}
        </p>

        <div>
          <label htmlFor="buyerName" className="text-xs text-slate-600">Full name</label>
          <input
            id="buyerName"
            className={inputClass}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            aria-invalid={!!errors.buyerName}
          />
          {errors.buyerName && <p role="alert" className="text-xs text-red-600 mt-1">{errors.buyerName}</p>}
        </div>

        <div>
          <label htmlFor="contactNumber" className="text-xs text-slate-600">Mobile number</label>
          <input
            id="contactNumber"
            inputMode="tel"
            className={inputClass}
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            aria-invalid={!!errors.contactNumber}
          />
          {errors.contactNumber && <p role="alert" className="text-xs text-red-600 mt-1">{errors.contactNumber}</p>}
        </div>

        {submitError && <p role="alert" className="text-sm text-red-600">{submitError}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
            Back to cart
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place order'}
          </Button>
        </div>
      </form>
    </Card>
  );
};