import React, { useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2, Info } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import { calculateOrderPricing } from './pricingCalculator';
import type { CartItem, ErrandOrderRequest, VirtualStore } from './types';

const dropZones = [
  'Science Complex Drop Hub',
  'Kasadpan Hall Runner Point',
  'CNSM Main Lobby',
  'MSU Main Library Kiosk',
  'College of Engineering Quadrangle',
];

export interface CartPageProps {
  store: VirtualStore;
  cart: CartItem[];
  selectedDropZone: string;
  onDropZoneChange: (dropZone: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onContinueShopping: () => void;
  onPlaceOrder: (orderData: ErrandOrderRequest) => Promise<void>;
}

export const CartPage: React.FC<CartPageProps> = ({
  store,
  cart,
  selectedDropZone,
  onDropZoneChange,
  onUpdateQuantity,
  onRemoveItem,
  onContinueShopping,
  onPlaceOrder,
}) => {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const pricingBreakdown = calculateOrderPricing(
    cart.map(({ product, quantity }) => ({ basePrice: product.basePrice, quantity })),
    store.markupPercentage,
    store.defaultConvenienceFee
  );
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || isPlacingOrder) return;

    setIsPlacingOrder(true);
    setCheckoutError(null);
    try {
      await onPlaceOrder({
        storeId: store.id,
        dropZone: selectedDropZone,
        items: cart.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice: product.markupPrice,
        })),
        totalProductCost: pricingBreakdown.subtotal,
        convenienceFee: pricingBreakdown.convenienceFee,
        totalAmount: pricingBreakdown.grandTotal,
      });
    } catch (error) {
      console.error('Failed to place errand order', error);
      setCheckoutError('We could not place your order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Card className="py-12 px-6 text-center">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
        <p className="text-sm text-slate-500 mt-2">Add items from the catalog to review them here.</p>
        <Button className="mt-5" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onContinueShopping}>
          Continue Shopping
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Cart</h2>
          <p className="text-sm text-slate-500">{store.name}</p>
        </div>
        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onContinueShopping}>
          Continue Shopping
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <section className="lg:col-span-2 space-y-3" aria-label="Cart items">
          {cart.map(({ product, quantity }) => (
            <Card key={product.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    <Badge variant="neutral" size="sm">{product.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {product.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                    <span>Unit price: <strong className="text-slate-700">₱{product.markupPrice.toFixed(2)}</strong></span>
                    <span>Vendor price: ₱{product.basePrice.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="self-end sm:self-start text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${product.name} from cart`}
                  onClick={() => onRemoveItem(product.id)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Remove
                </Button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Reduce ${product.name} quantity`}
                    disabled={quantity <= 1}
                    onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="min-w-8 text-center text-sm font-semibold" aria-label={`Quantity ${quantity}`}>
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Increase ${product.name} quantity`}
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-slate-500">Quantity</span>
                </div>
                <p className="font-bold text-slate-900">
                  ₱{(product.markupPrice * quantity).toFixed(2)}
                </p>
              </div>
            </Card>
          ))}
        </section>

        <Card className="lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-900">Order Summary</h3>
            <Badge variant="neutral" size="sm">{cartItemCount} items</Badge>
          </div>

          <div className="mt-4">
            <label htmlFor="cart-drop-zone" className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Drop Zone
            </label>
            <select
              id="cart-drop-zone"
              className="w-full text-sm p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-msu-maroon"
              value={selectedDropZone}
              onChange={(event) => onDropZoneChange(event.target.value)}
            >
              {dropZones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 text-sm space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span>Base vendor total</span>
              <span>₱{pricingBreakdown.basePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Store markup ({store.markupPercentage}%)</span>
              <span>₱{pricingBreakdown.markupAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-800">
              <span>Items subtotal</span>
              <span>₱{pricingBreakdown.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-msu-maroon">
              <span>Courier errand fee</span>
              <span>₱{pricingBreakdown.convenienceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 text-base pt-3 border-t border-slate-200">
              <span>Total (COD)</span>
              <span className="text-msu-maroon">₱{pricingBreakdown.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {checkoutError && (
            <p role="alert" className="mt-3 text-sm text-rose-700">{checkoutError}</p>
          )}

          <Button
            variant="primary"
            className="w-full mt-4"
            isLoading={isPlacingOrder}
            onClick={() => void handleCheckout()}
          >
            Place Errand Request (COD)
          </Button>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded mt-3">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Verified with 4-Digit OTP handoff at drop zone.</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
