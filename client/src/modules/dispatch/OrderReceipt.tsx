import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import type { Order } from './orderTypes';

export interface OrderReceiptProps {
  order: Order;
}

export const OrderReceipt: React.FC<OrderReceiptProps> = ({ order }) => (
  <Card className="space-y-4" data-testid="order-receipt">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Order placed
        </h3>
        <p className="text-xs text-slate-500">
          {order.storeName} received your request.
        </p>
      </div>
      <Badge variant="warning">Pending</Badge>
    </div>

    <dl className="text-xs grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
      <dt className="text-slate-500">Order ID</dt>
      <dd className="font-mono text-slate-800 break-all">{order.id}</dd>
      <dt className="text-slate-500">Placed</dt>
      <dd className="text-slate-800">{new Date(order.createdAt).toLocaleString()}</dd>
      <dt className="text-slate-500">Deliver to</dt>
      <dd className="text-slate-800">{order.deliveryAddress}</dd>
    </dl>

    <ul className="divide-y divide-slate-100 text-sm border-y border-slate-100">
      {order.items.map((i) => (
        <li key={i.productId} className="flex justify-between py-1.5">
          <span>
            {i.quantity} × {i.name}
          </span>
          <span>₱{(i.unitPrice * i.quantity).toFixed(2)}</span>
        </li>
      ))}
    </ul>

    <div className="text-sm space-y-1">
      <p className="flex justify-between text-slate-600">
        <span>Items</span>
        <span>₱{order.totalProductCost.toFixed(2)}</span>
      </p>
      <p className="flex justify-between text-slate-600">
        <span>Delivery fee</span>
        <span>₱{order.convenienceFee.toFixed(2)}</span>
      </p>
      <p className="flex justify-between font-bold text-slate-900">
        <span>Total</span>
        <span>₱{order.totalAmount.toFixed(2)}</span>
      </p>
    </div>
  </Card>
);