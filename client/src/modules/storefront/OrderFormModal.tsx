import React, { useState } from 'react';
import { ShoppingBag, X, User, MapPin, AlertCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import type { VirtualStore, ProductItem, OrderFormData } from './types';

export interface OrderFormModalProps {
  store: VirtualStore;
  cart: Array<{ product: ProductItem; quantity: number }>;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSubmit: (formData: OrderFormData) => void;
  onClose: () => void;
}

export const CAMPUS_DROP_ZONES = [
  'Science Complex Drop Hub',
  'Kasadpan Hall Runner Point',
  'CNSM Main Lobby',
  'MSU Main Library Kiosk',
  'College of Engineering Quadrangle',
];

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  store,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onSubmit,
  onClose,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [buyerStudentId, setBuyerStudentId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [dropZone, setDropZone] = useState(CAMPUS_DROP_ZONES[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [errors, setErrors] = useState<{
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    items?: string;
  }>({});

  const totalProductCost = cart.reduce(
    (sum, item) => sum + item.product.markupPrice * item.quantity,
    0
  );
  const convenienceFee = store.defaultConvenienceFee;
  const totalAmount = totalProductCost + (cart.length > 0 ? convenienceFee : 0);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Contact phone number is required';
    }

    if (!deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Delivery address is required';
    }

    if (cart.length === 0) {
      newErrors.items = 'Please select at least one product';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      buyerStudentId: buyerStudentId.trim() || undefined,
      deliveryAddress: deliveryAddress.trim(),
      dropZone,
      deliveryNotes: deliveryNotes.trim() || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-msu-maroon text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-msu-gold text-slate-900 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 id="order-form-title" className="text-lg font-bold">
                Place Purchase Order
              </h3>
              <p className="text-xs text-red-200">
                Store: <strong>{store.name}</strong> • {store.vendorOrigin}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close order form"
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Customer Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-msu-maroon" />
              <span>Customer Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: undefined }));
                  }}
                  placeholder="e.g. Sittie Norhaima"
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.customerName
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-msu-maroon/20 focus:border-msu-maroon'
                  }`}
                />
                {errors.customerName && (
                  <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="customer-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (errors.customerPhone) setErrors((prev) => ({ ...prev, customerPhone: undefined }));
                  }}
                  placeholder="e.g. 0917 123 4567"
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.customerPhone
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-msu-maroon/20 focus:border-msu-maroon'
                  }`}
                />
                {errors.customerPhone && (
                  <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.customerPhone}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="buyer-student-id" className="block text-xs font-semibold text-slate-700 mb-1">
                  MSU Student ID Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="buyer-student-id"
                  type="text"
                  value={buyerStudentId}
                  onChange={(e) => setBuyerStudentId(e.target.value)}
                  placeholder="e.g. 2023-01429"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-msu-maroon/20 focus:border-msu-maroon"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-msu-maroon" />
              <span>Delivery Address & Drop Zone</span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="delivery-address" className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="delivery-address"
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (errors.deliveryAddress) setErrors((prev) => ({ ...prev, deliveryAddress: undefined }));
                  }}
                  placeholder="e.g. Room 204, Dormitory 2, Commercial Center Area, MSU Main Campus"
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.deliveryAddress
                      ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-msu-maroon/20 focus:border-msu-maroon'
                  }`}
                />
                {errors.deliveryAddress && (
                  <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.deliveryAddress}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="drop-zone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Designated Campus Drop Hub
                  </label>
                  <select
                    id="drop-zone"
                    value={dropZone}
                    onChange={(e) => setDropZone(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-msu-maroon/20 focus:border-msu-maroon"
                  >
                    {CAMPUS_DROP_ZONES.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="delivery-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                    Special Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="delivery-notes"
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Please message before pickup"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-msu-maroon/20 focus:border-msu-maroon"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Product Selections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-msu-maroon" />
                <span>Product Selections ({cart.length})</span>
              </div>
              <span className="text-xs font-normal text-slate-500">
                Zero-capital markup included
              </span>
            </div>

            {errors.items && (
              <p className="text-xs text-rose-500 flex items-center gap-1 bg-rose-50 p-2 rounded border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.items}
              </p>
            )}

            {cart.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No products selected. Please add items to your cart.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {cart.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="p-3 bg-white flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {product.name}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        ₱{product.markupPrice.toFixed(2)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          disabled={quantity <= 1}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                          aria-label={`Decrease quantity of ${product.name}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-semibold text-slate-800 min-w-[20px] text-center">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200"
                          aria-label={`Increase quantity of ${product.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="font-bold text-slate-900 w-16 text-right">
                        ₱{(product.markupPrice * quantity).toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Breakdown */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Products Subtotal:</span>
                <span className="font-semibold text-slate-800">
                  ₱{totalProductCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Courier Convenience Fee:</span>
                <span className="font-semibold text-slate-800">
                  ₱{convenienceFee.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total Amount (Cash on Delivery):</span>
                <span className="text-base text-msu-maroon font-bold">
                  ₱{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={cart.length === 0}
            >
              Confirm & Place Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
