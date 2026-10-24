import React, { useState } from 'react';
import { Store, ShoppingCart, MapPin, Percent, Info, FileText, Plus, Minus, Trash2 } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import { ProductCard } from './ProductCard';
import { OrderFormModal } from './OrderFormModal';
import { OrderReceiptModal } from './OrderReceiptModal';
import { calculateOrderPricing } from './pricingCalculator';
import type {
  VirtualStore,
  ProductItem,
  OrderFormData,
  OrderReceiptData,
  OrderItem,
} from './types';

export interface StoreCatalogProps {
  store: VirtualStore;
  products: ProductItem[];
  onPlaceOrder?: (orderData: any) => void;
}

export const StoreCatalog: React.FC<StoreCatalogProps> = ({
  store,
  products,
  onPlaceOrder,
}) => {
  const [cart, setCart] = useState<Array<{ product: ProductItem; quantity: number }>>([]);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<OrderReceiptData | null>(null);

  const handleAddToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const pricingItems = cart.map((item) => ({
    basePrice: item.product.basePrice,
    quantity: item.quantity,
  }));

  const pricingBreakdown = calculateOrderPricing(
    pricingItems,
    store.markupPercentage,
    store.defaultConvenienceFee
  );

  const handleOpenOrderForm = () => {
    if (cart.length === 0) return;
    setIsOrderFormOpen(true);
  };

  const handleOrderFormSubmit = (formData: OrderFormData) => {
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const timestamp = Date.now();
    const orderItems: OrderItem[] = cart.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.product.markupPrice,
    }));

    const receiptData: OrderReceiptData = {
      id: orderId,
      storeId: store.id,
      storeName: store.name,
      vendorOrigin: store.vendorOrigin,
      hostName: store.hostName,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      buyerStudentId: formData.buyerStudentId,
      deliveryAddress: formData.deliveryAddress,
      dropZone: formData.dropZone,
      deliveryNotes: formData.deliveryNotes,
      items: orderItems,
      totalProductCost: pricingBreakdown.subtotal,
      convenienceFee: pricingBreakdown.convenienceFee,
      totalAmount: pricingBreakdown.grandTotal,
      status: 'Pending',
      createdAt: timestamp,
    };

    const fullOrderPayload = {
      ...formData,
      id: orderId,
      storeId: store.id,
      storeName: store.name,
      items: orderItems,
      totalProductCost: pricingBreakdown.subtotal,
      convenienceFee: pricingBreakdown.convenienceFee,
      totalAmount: pricingBreakdown.grandTotal,
      status: 'Pending',
      createdAt: timestamp,
    };

    onPlaceOrder?.(fullOrderPayload);
    setActiveReceipt(receiptData);
    setIsOrderFormOpen(false);
    setCart([]);
  };

  return (
    <div className="space-y-6">
      {/* Store Header Banner */}
      <Card className="bg-gradient-to-r from-red-900 to-msu-maroon text-white p-6 border-0 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-6 h-6 text-msu-gold" />
              <h2 className="text-2xl font-bold tracking-tight">{store.name}</h2>
              <Badge variant="warning" size="sm" className="bg-msu-gold/20 text-msu-gold border-msu-gold/30">
                Zero-Capital Host
              </Badge>
            </div>
            <p className="text-red-100 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-msu-gold" />
              Source Vendor: <strong>{store.vendorOrigin}</strong> | Host: {store.hostName} ({store.hostStudentId})
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/20 p-3 rounded-lg backdrop-blur-sm">
            <div className="text-center">
              <div className="text-xs text-red-200">Convenience Fee</div>
              <div className="text-lg font-bold text-msu-gold">₱{store.defaultConvenienceFee.toFixed(2)}</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-xs text-red-200">Host Markup</div>
              <div className="text-lg font-bold text-msu-gold flex items-center justify-center gap-0.5">
                <Percent className="w-3.5 h-3.5" />
                {store.markupPercentage}%
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Catalog Products vs Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">
              Campus Curated Catalog ({products.length})
            </h3>
            <div className="flex items-center gap-2">
              {activeReceipt && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<FileText className="w-3.5 h-3.5 text-msu-maroon" />}
                  onClick={() => setActiveReceipt(activeReceipt)}
                >
                  View Receipt (#{activeReceipt.id})
                </Button>
              )}
              <span className="text-xs text-slate-500 hidden sm:inline">
                On-demand purchase by peer student couriers
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>

        {/* Errand Cart & Order Placement */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-msu-maroon" />
                <h4 className="font-bold text-slate-900">Your Errand Cart</h4>
              </div>
              <Badge variant="neutral" size="sm">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </Badge>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Select items from the catalog to build an order
                {activeReceipt && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Previous order created:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                      onClick={() => setActiveReceipt(activeReceipt)}
                    >
                      View Receipt #{activeReceipt.id}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-slate-800 truncate">{product.name}</div>
                        <div className="text-slate-500">
                          ₱{product.markupPrice.toFixed(2)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded bg-white">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                            className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                            aria-label={`Decrease ${product.name}`}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1 font-semibold text-slate-800 text-[11px]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                            className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                            aria-label={`Increase ${product.name}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className="font-bold text-slate-800 w-12 text-right">
                          ₱{(product.markupPrice * quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => handleRemoveFromCart(product.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          aria-label={`Remove ${product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Vendor Total:</span>
                    <span>₱{pricingBreakdown.basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Store Markup ({store.markupPercentage}%):</span>
                    <span>₱{pricingBreakdown.markupAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-800">
                    <span>Items Subtotal:</span>
                    <span>₱{pricingBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-msu-maroon font-semibold">
                    <span>Courier Errand Fee:</span>
                    <span>₱{pricingBreakdown.convenienceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-300">
                    <span>Grand Total (COD):</span>
                    <span className="text-msu-maroon text-base">
                      ₱{pricingBreakdown.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleOpenOrderForm}
                >
                  Place Order (Fill Details)
                </Button>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Collects customer details, address, and creates pending order receipt.</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Order Form Modal */}
      {isOrderFormOpen && (
        <OrderFormModal
          store={store}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onSubmit={handleOrderFormSubmit}
          onClose={() => setIsOrderFormOpen(false)}
        />
      )}

      {/* Order Receipt Modal */}
      {activeReceipt && (
        <OrderReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
