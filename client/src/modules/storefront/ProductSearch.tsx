import React, { useMemo, useState } from 'react';
import { Search, Store } from 'lucide-react';
import type { LocalProduct, LocalStore } from '../offline/types';

interface ProductSearchProps {
  stores: LocalStore[];
  products: LocalProduct[];
  onSelectStore: (storeId: string) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  stores,
  products,
  onSelectStore,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return [];

    return products
      .filter((product) => {
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);

        return matchesName || matchesCategory;
      })
      .map((product) => ({
        product,
        store: stores.find((store) => store.id === product.storeId),
      }))
      .filter((result) => result.store && result.store.isActive);
  }, [searchQuery, products, stores]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Search Products Across Stores
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Find products by name or category from different campus stores.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search product name or category..."
          className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-msu-maroon focus:ring-2 focus:ring-msu-maroon/20"
        />
      </div>

      {searchQuery.trim() && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {searchResults.length} result(s) found
          </p>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map(({ product, store }) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {product.category}
                    </span>

                    <span
                      className={`text-xs font-medium ${
                        product.isAvailable
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {product.isAvailable ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>

                  <h3 className="mt-2 font-semibold text-slate-900">
                    {product.name}
                  </h3>

                  <p className="mt-2 text-lg font-bold text-msu-maroon">
                    ₱{Number(product.markupPrice).toFixed(2)}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Store className="w-4 h-4" />
                    <span>{store?.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectStore(product.storeId)}
                    className="mt-4 w-full rounded-lg bg-msu-maroon px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    View Store
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 font-medium text-slate-700">
                No products found
              </p>
              <p className="text-sm text-slate-500">
                Try another product name or category.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};