import React from 'react';
import { CheckCircle2, Printer, X, MapPin, User, Clock, Store, Tag } from 'lucide-react';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import type { OrderReceiptData } from './types';

export interface OrderReceiptModalProps {
  receipt: OrderReceiptData;
  onClose: () => void;
  onPrint?: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  receipt,
  onClose,
  onPrint,
}) => {
  const formattedTimestamp =
    typeof receipt.createdAt === 'number'
      ? new Date(receipt.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : new Date(receipt.createdAt).toLocaleString();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 id="receipt-title" className="text-lg font-bold">
                Order Receipt
              </h3>
              <p className="text-xs text-emerald-100">
                Purchase request successfully generated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receipt"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 print:p-0">
          {/* Top Metadata Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                Order ID
              </span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                #{receipt.id}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                Order Status
              </span>
              <Badge variant="warning" size="sm" className="font-semibold mt-0.5">
                {receipt.status}
              </Badge>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                <strong>Timestamp:</strong> {formattedTimestamp}
              </span>
            </div>
          </div>

          {/* Store & Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-200">
                <Store className="w-3.5 h-3.5 text-msu-maroon" />
                <span>Store Information</span>
              </div>
              <p className="text-slate-700">
                <strong>Store:</strong> {receipt.storeName}
              </p>
              <p className="text-slate-500">
                <strong>Origin:</strong> {receipt.vendorOrigin}
              </p>
              {receipt.hostName && (
                <p className="text-slate-500">
                  <strong>Host:</strong> {receipt.hostName}
                </p>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-200">
                <User className="w-3.5 h-3.5 text-msu-maroon" />
                <span>Customer Details</span>
              </div>
              <p className="text-slate-700">
                <strong>Name:</strong> {receipt.customerName}
              </p>
              <p className="text-slate-600">
                <strong>Phone:</strong> {receipt.customerPhone}
              </p>
              {receipt.buyerStudentId && (
                <p className="text-slate-500">
                  <strong>Student ID:</strong> {receipt.buyerStudentId}
                </p>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-msu-maroon" />
              <span>Delivery Details</span>
            </div>
            <p className="text-slate-700">
              <strong>Address:</strong> {receipt.deliveryAddress}
            </p>
            <p className="text-slate-600">
              <strong>Campus Drop Hub:</strong> {receipt.dropZone}
            </p>
            {receipt.deliveryNotes && (
              <p className="text-slate-500 italic">
                <strong>Notes:</strong> {receipt.deliveryNotes}
              </p>
            )}
          </div>

          {/* Product Selections Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Tag className="w-3.5 h-3.5 text-msu-maroon" />
              <span>Purchased Products ({receipt.items.length})</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-800">{item.name}</td>
                      <td className="p-2.5 text-center text-slate-600">{item.quantity}</td>
                      <td className="p-2.5 text-right text-slate-600">
                        ₱{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-slate-800">
                        ₱{(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Breakdown */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Products Subtotal:</span>
              <span className="font-semibold text-slate-800">
                ₱{receipt.totalProductCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Convenience / Errand Fee:</span>
              <span className="font-semibold text-slate-800">
                ₱{receipt.convenienceFee.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <span>Grand Total (Cash On Delivery):</span>
              <span className="text-base text-msu-maroon font-bold">
                ₱{receipt.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notice */}
          <div className="text-[11px] text-slate-500 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            Keep this receipt for reference upon delivery at <strong>{receipt.dropZone}</strong>.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Receipt
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
