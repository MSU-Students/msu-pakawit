import React from 'react';
import { Store, ShoppingCart, MapPin, Percent } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import { ProductCard } from './ProductCard';
import type { VirtualStore, ProductItem } from './types';

export interface StoreCatalogProps {
  store: VirtualStore;
  products: ProductItem[];
  cartItemCount: number;
  onAddToCart: (product: ProductItem) => void;
  onViewCart: () => void;
}

export const StoreCatalog: React.FC<StoreCatalogProps> = ({
  store,
  products,
  cartItemCount,
  onAddToCart,
  onViewCart,
}) => {
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

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Campus Curated Catalog ({products.length})
            </h3>
            <span className="text-xs text-slate-500">
              On-demand purchase by peer student couriers
            </span>
          </div>
          <Button
            variant="outline"
            leftIcon={<ShoppingCart className="w-4 h-4" />}
            onClick={onViewCart}
          >
            View Cart ({cartItemCount})
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
