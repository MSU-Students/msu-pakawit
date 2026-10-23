import React, { useState } from 'react';
import { Store, ShoppingCart, MapPin, Percent, Info, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import { ProductCard } from './ProductCard';
import { calculateOrderPricing } from './pricingCalculator';
import { useCart, MAX_QTY } from './useCart';
import type { VirtualStore, ProductItem } from './types';

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
  // US-2.1.2: cart logic is now in useCart (add / remove / adjust / persist)
  const { lines: cart, addItem, setQuantity, removeItem, clearCart, itemCount } = useCart(products);

  const [selectedDropZone, setSelectedDropZone] = useState('Science Complex Drop Hub');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [search, setSearch] = useState('');

  const dropZones = [
    'Science Complex Drop Hub',
    'Kasadpan Hall Runner Point',
    'CNSM Main Lobby',
    'MSU Main Library Kiosk',
    'College of Engineering Quadrangle',
  ];

  const handleAddToCart = (product: ProductItem) => {
    addItem(product);
  };

  // Totals recalculate automatically on every cart change (computed on each render)
  const pricingItems = cart.map((item) => ({
    basePrice: Number(item.product.basePrice),
    quantity: item.quantity,
  }));

  const pricingBreakdown = calculateOrderPricing(
    pricingItems,
    store.markupPercentage,
    store.defaultConvenienceFee
  );

  const categories = ['All categories', ...new Set(products.filter((product) => product.isActive !== false).map((product) => product.category))];
  const visibleProducts = products.filter((product) =>
    product.isActive !== false &&
    (categoryFilter === 'All categories' || product.category === categoryFilter) &&
    `${product.name} ${product.description ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const orderData = {
      storeId: store.id,
      dropZone: selectedDropZone,
      items: cart.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitPrice: Number(i.product.markupPrice),
      })),
      totalProductCost: pricingBreakdown.subtotal,
      convenienceFee: pricingBreakdown.convenienceFee,
      totalAmount: pricingBreakdown.grandTotal,
    };
    onPlaceOrder?.(orderData);
    clearCart();
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
              Campus Curated Catalog ({visibleProducts.length})
            </h3>
            <span className="text-xs text-slate-500">
              On-demand purchase by peer student couriers
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search products" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <select aria-label="Filter by category" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
            {visibleProducts.length === 0 && <p className="col-span-full rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">No products match your search.</p>}
          </div>
        </div>

        {/* Errand Cart & Drop Hub Selection */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-msu-maroon" />
                <h4 className="font-bold text-slate-900">Your Errand Cart</h4>
              </div>
              <Badge variant="neutral" size="sm">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Badge>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium text-slate-700">Your cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Select items from the catalog to build an errand request
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {cart.map(({ product, quantity }) => {
                    const unitPrice = Number(product.markupPrice);
                    return (
                      <div key={product.id} className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-800">{product.name}</div>
                          <button
                            type="button"
                            aria-label={`Remove ${product.name} from cart`}
                            onClick={() => removeItem(product.id)}
                            className="text-rose-500 hover:text-rose-700 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${product.name}`}
                              onClick={() => setQuantity(product.id, quantity - 1)}
                              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-semibold text-slate-800">{quantity}</span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${product.name}`}
                              onClick={() => setQuantity(product.id, quantity + 1)}
                              disabled={quantity >= MAX_QTY}
                              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-slate-500">₱{unitPrice.toFixed(2)} each</div>
                            <div className="font-bold text-slate-900">₱{(unitPrice * quantity).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Drop Zone Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Campus Drop Zone (Hub)
                  </label>
                  <select
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-msu-maroon"
                    value={selectedDropZone}
                    onChange={(e) => setSelectedDropZone(e.target.value)}
                  >
                    {dropZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
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
                    <span className="text-msu-maroon text-base">₱{pricingBreakdown.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleCheckout}
                >
                  Place Errand Request (COD)
                </Button>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Verified with 4-Digit OTP handoff at drop zone.</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
