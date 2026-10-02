import React from 'react';
import { Plus, Tag } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import type { ProductItem } from './types';

export interface ProductCardProps {
  product: ProductItem;
  onAddToCart?: (product: ProductItem) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <Card hoverEffect className="flex flex-col justify-between h-full bg-white">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="neutral" size="sm">
            {product.category}
          </Badge>
          {product.isAvailable ? (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Out of Stock</span>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-msu-maroon">
            ₱{product.markupPrice.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 line-through">
            ₱{product.basePrice.toFixed(2)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
          <Tag className="w-3 h-3 text-slate-400" />
          <span>Vendor base price + zero-inventory markup</span>
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <Button
          size="sm"
          variant="primary"
          className="w-full"
          disabled={!product.isAvailable}
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => onAddToCart?.(product)}
        >
          Add to Errand Cart
        </Button>
      </div>
    </Card>
  );
};
