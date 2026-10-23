import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Check, Layers3, PackagePlus, Pencil, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { ProductItem, VirtualStore } from './types';
import { storefrontApi, type ProductInput, type StoreCategory, type StoreInput } from './storefrontApi';
import { apiClient } from '../shared/apiClient';

interface ProductManagementProps {
  onCatalogChanged?: (storeId: string) => void;
}

const emptyProduct = (): ProductInput => ({ name: '', description: '', imageUrls: [], category: '', basePrice: 0 });
const emptyStore = (): StoreInput => ({ name: '', description: '', vendorOrigin: '', defaultConvenienceFee: 35, markupPercentage: 10 });

export const ProductManagement: React.FC<ProductManagementProps> = ({ onCatalogChanged }) => {
  const [accessToken, setAccessToken] = useState(() => {
    try { return sessionStorage.getItem('pakawitAccessToken') ?? ''; } catch { return ''; }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [stores, setStores] = useState<VirtualStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [form, setForm] = useState<ProductInput>(emptyProduct());
  const [storeForm, setStoreForm] = useState<StoreInput>(emptyStore());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStores = useCallback(async () => {
    const response = await storefrontApi.listMyStores();
    if (!response.success || !response.data) throw new Error(response.error || 'Could not load your stores.');
    setStores(response.data);
    setSelectedStoreId((current) => current && response.data?.some((store) => store.id === current)
      ? current
      : response.data?.[0]?.id ?? '');
  }, []);

  const loadStoreData = useCallback(async (storeId: string) => {
    if (!storeId) {
      setProducts([]);
      setCategories([]);
      return;
    }
    const [storesResult, categoriesResult] = await Promise.all([
      storefrontApi.listMyStores(),
      storefrontApi.listCategories(storeId),
    ]);
    if (!storesResult.success || !storesResult.data) throw new Error(storesResult.error || 'Could not load the catalog.');
    if (!categoriesResult.success || !categoriesResult.data) throw new Error(categoriesResult.error || 'Could not load categories.');
    const store = storesResult.data.find((candidate) => candidate.id === storeId);
    setProducts(store?.products ?? []);
    setCategories(categoriesResult.data);
  }, []);

  useEffect(() => {
    apiClient.setAccessToken(accessToken || null);
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;
    if (!accessToken) {
      setStores([]);
      setSelectedStoreId('');
      setProducts([]);
      setCategories([]);
      setLoading(false);
      return () => { mounted = false; };
    }
    setLoading(true);
    storefrontApi.listMyStores().then((response) => {
      if (!mounted) return;
      if (!response.success || !response.data) {
        setError(response.error || 'Could not load your stores.');
        return;
      }
      setStores(response.data);
      setSelectedStoreId(response.data[0]?.id ?? '');
    }).catch((cause: Error) => mounted && setError(cause.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [accessToken]);

  useEffect(() => {
    if (!selectedStoreId) return;
    let mounted = true;
    setLoading(true);
    Promise.all([storefrontApi.listMyStores(), storefrontApi.listCategories(selectedStoreId)])
      .then(([storesResult, categoriesResult]) => {
        if (!mounted) return;
        if (!storesResult.success || !storesResult.data) throw new Error(storesResult.error || 'Could not load the catalog.');
        if (!categoriesResult.success || !categoriesResult.data) throw new Error(categoriesResult.error || 'Could not load categories.');
        const store = storesResult.data.find((candidate) => candidate.id === selectedStoreId);
        setProducts(store?.products ?? []);
        setCategories(categoriesResult.data);
        setError('');
      })
      .catch((cause: Error) => mounted && setError(cause.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [selectedStoreId]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const visibleProducts = useMemo(
    () => products.filter((product) => showArchived || product.isActive !== false),
    [products, showArchived],
  );

  const refresh = async () => {
    if (selectedStoreId) {
      await loadStoreData(selectedStoreId);
      onCatalogChanged?.(selectedStoreId);
    }
    await loadStores();
  };

  const submitProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStoreId) return;
    setSaving(true);
    setError('');
    setNotice('');
    const payload = { ...form, name: form.name.trim(), category: form.category.trim(), imageUrls: form.imageUrls };
    const result = editingId
      ? await storefrontApi.updateProduct(selectedStoreId, editingId, payload)
      : await storefrontApi.createProduct(selectedStoreId, payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save product.');
      return;
    }
    setForm(emptyProduct());
    setEditingId(null);
    setNotice(editingId ? 'Product updated.' : 'Product created and published to the catalog.');
    await refresh();
  };

  const submitStore = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const result = await storefrontApi.createStore(storeForm);
    setSaving(false);
    if (!result.success) return setError(result.error || 'Could not create store.');
    setStoreForm(emptyStore());
    setNotice('Store created. You can now manage its product catalog.');
    const storesResult = await storefrontApi.listMyStores();
    if (storesResult.success && storesResult.data) {
      setStores(storesResult.data);
      setSelectedStoreId(result.data?.id ?? storesResult.data[0]?.id ?? '');
    }
  };

  const beginEdit = (product: ProductItem) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? '',
      imageUrls: product.imageUrls ?? [],
      category: product.category,
      basePrice: Number(product.basePrice),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeAvailability = async (product: ProductItem) => {
    const result = await storefrontApi.setAvailability(selectedStoreId, product.id, !product.isAvailable);
    if (!result.success) return setError(result.error || 'Could not update stock status.');
    setNotice(`${product.name} marked ${product.isAvailable ? 'out of stock' : 'in stock'}.`);
    await refresh();
  };

  const archive = async (product: ProductItem) => {
    if (!window.confirm(`Archive “${product.name}”? It will no longer appear in the customer catalog.`)) return;
    const result = await storefrontApi.archiveProduct(selectedStoreId, product.id);
    if (!result.success) return setError(result.error || 'Could not archive product.');
    setNotice('Product archived.');
    await refresh();
  };

  const restore = async (product: ProductItem) => {
    const result = await storefrontApi.restoreProduct(selectedStoreId, product.id);
    if (!result.success) return setError(result.error || 'Could not restore product.');
    setNotice('Product restored to the customer catalog.');
    await refresh();
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    const result = await storefrontApi.createCategory(selectedStoreId, newCategory.trim());
    if (!result.success) return setError(result.error || 'Could not create category.');
    setNewCategory('');
    setCategories((current) => [...current, result.data!].sort((a, b) => a.name.localeCompare(b.name)));
    setNotice('Category created.');
  };

  const saveCategoryName = async (category: StoreCategory) => {
    const name = editingCategoryName.trim();
    if (!name) return;
    const result = await storefrontApi.renameCategory(selectedStoreId, category.id, name);
    if (!result.success) return setError(result.error || 'Could not rename category.');
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setNotice('Category renamed and linked products updated.');
    await refresh();
  };

  const removeCategory = async (category: StoreCategory) => {
    const result = await storefrontApi.deleteCategory(selectedStoreId, category.id);
    if (!result.success) return setError(result.error || 'Could not delete category.');
    setCategories((current) => current.filter((item) => item.id !== category.id));
    setNotice('Category deleted.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-msu-maroon">Store owner tools</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Product catalog</h1>
          <p className="mt-1 text-sm text-slate-500">Manage listings, stock visibility, and categories. Changes publish to shoppers immediately.</p>
        </div>
        {stores.length > 0 && (
          <label className="text-sm font-semibold text-slate-700">
            Store
            <select className="mt-1 block min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2" value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      {!accessToken && <Card className="border-amber-200 bg-amber-50">
        <p className="font-semibold text-amber-900">Sign in to your owner account</p><p className="mt-1 text-sm text-amber-800">Use your Pakawit account to load your stores and manage catalog changes.</p>
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (event) => { event.preventDefault(); setConnecting(true); setError(''); const result = await storefrontApi.login(username, password); setConnecting(false); if (!result.success || !result.data) return setError(result.error || 'Sign-in failed.'); try { sessionStorage.setItem('pakawitAccessToken', result.data.accessToken); } catch { /* session storage may be unavailable */ } setPassword(''); setAccessToken(result.data.accessToken); }}><input aria-label="Username" autoComplete="username" required className="min-w-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} /><input aria-label="Password" type="password" autoComplete="current-password" required className="min-w-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button type="submit" size="sm" isLoading={connecting}>Sign in</Button></form>
      </Card>}

      {accessToken && <div className="flex justify-end"><button className="text-xs text-slate-500 underline hover:text-slate-800" onClick={() => { try { sessionStorage.removeItem('pakawitAccessToken'); } catch { /* session storage may be unavailable */ } setAccessToken(''); setUsername(''); }}>Sign out</button></div>}

      {loading ? <Card><p className="text-sm text-slate-500">Loading your catalog…</p></Card> : !accessToken ? null : stores.length === 0 ? (
        <Card>
          <div className="mb-4 flex items-center gap-2"><Layers3 className="h-5 w-5 text-msu-maroon" /><div><h2 className="font-bold text-slate-900">Create your store</h2><p className="text-xs text-slate-500">Stores are linked to the signed-in account.</p></div></div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitStore}>
            <label className="text-sm font-medium text-slate-700">Store name<input required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Vendor origin<input required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Commercial Center" value={storeForm.vendorOrigin} onChange={(event) => setStoreForm({ ...storeForm, vendorOrigin: event.target.value })} /></label>
            <label className="text-sm font-medium text-slate-700">Convenience fee (₱)<input required min="0" step="0.01" type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={storeForm.defaultConvenienceFee} onChange={(event) => setStoreForm({ ...storeForm, defaultConvenienceFee: Number(event.target.value) })} /></label>
            <label className="text-sm font-medium text-slate-700">Markup (%)<input required min="0" max="100" step="0.01" type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={storeForm.markupPercentage} onChange={(event) => setStoreForm({ ...storeForm, markupPercentage: Number(event.target.value) })} /></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={storeForm.description ?? ''} onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })} /></label>
            <div><Button type="submit" isLoading={saving}>Create store</Button></div>
          </form>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
            <Card>
              <div className="mb-5 flex items-center gap-2"><PackagePlus className="h-5 w-5 text-msu-maroon" /><div><h2 className="font-bold text-slate-900">{editingId ? 'Edit product' : 'Create a product'}</h2><p className="text-xs text-slate-500">{selectedStore?.name}</p></div></div>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitProduct}>
                <label className="text-sm font-medium text-slate-700">Product name<input required maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                  <label className="text-sm font-medium text-slate-700">Category<select required className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-700">Base price (₱)<input required min="0" step="0.01" type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: Number(event.target.value) })} /></label>
                <label className="text-sm font-medium text-slate-700">Image URLs <span className="font-normal text-slate-400">(one per line)</span><textarea rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.imageUrls.join('\n')} onChange={(event) => setForm({ ...form, imageUrls: event.target.value.split('\n').map((url) => url.trim()).filter(Boolean) })} placeholder="https://…" /></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                <div className="flex gap-2 sm:col-span-2"><Button type="submit" isLoading={saving} leftIcon={<Check className="h-4 w-4" />}>{editingId ? 'Save changes' : 'Publish product'}</Button>{editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyProduct()); }}>Cancel</Button>}</div>
              </form>
            </Card>

            <Card>
              <div className="mb-4 flex items-center gap-2"><Tag className="h-5 w-5 text-msu-maroon" /><div><h2 className="font-bold text-slate-900">Categories</h2><p className="text-xs text-slate-500">Organize the store’s catalog</p></div></div>
              <form onSubmit={addCategory} className="mb-4 flex gap-2"><input aria-label="New category" required maxLength={80} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. School Supplies" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} /><Button type="submit" size="sm" aria-label="Add category"><Plus className="h-4 w-4" /></Button></form>
              <ul className="divide-y divide-slate-100">
                {categories.map((category) => <li key={category.id} className="flex items-center gap-2 py-2">
                  {editingCategoryId === category.id ? <><input autoFocus aria-label="Category name" className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} /><button aria-label="Save category" className="text-emerald-700" onClick={() => saveCategoryName(category)}><Check className="h-4 w-4" /></button><button aria-label="Cancel rename" className="text-slate-500" onClick={() => setEditingCategoryId(null)}>×</button></> : <><span className="min-w-0 flex-1 text-sm text-slate-700">{category.name}</span><button aria-label={`Rename ${category.name}`} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}><Pencil className="h-3.5 w-3.5" /></button><button aria-label={`Delete ${category.name}`} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => removeCategory(category)}><Trash2 className="h-3.5 w-3.5" /></button></>}
                </li>)}
                {categories.length === 0 && <li className="py-5 text-center text-sm text-slate-400">Add a category to publish products.</li>}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-900">Products <span className="text-sm font-normal text-slate-500">({visibleProducts.length})</span></h2><p className="text-xs text-slate-500">Inventory status and archive state are reflected on the shopper catalog.</p></div><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Show archived</label></div>
            {visibleProducts.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">No products to show. Create your first product above.</div> : <div className="space-y-3">{visibleProducts.map((product) => <div key={product.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${product.isActive === false ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-slate-200'}`}>
              {product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100"><Layers3 className="h-6 w-6 text-slate-300" /></div>}
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{product.name}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{product.category}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${product.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{product.isAvailable ? 'In stock' : 'Out of stock'}</span>{product.isActive === false && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Archived</span>}</div><p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description || 'No description'}</p><p className="mt-1 text-sm font-semibold text-slate-800">₱{Number(product.markupPrice).toFixed(2)} <span className="font-normal text-slate-400">customer price</span></p></div>
              <div className="flex flex-wrap gap-2">{product.isActive === false ? <Button size="sm" variant="outline" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => restore(product)}>Restore</Button> : <><Button size="sm" variant="outline" onClick={() => changeAvailability(product)}>{product.isAvailable ? 'Mark out of stock' : 'Mark in stock'}</Button><Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => beginEdit(product)}>Edit</Button><Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" leftIcon={<Archive className="h-3.5 w-3.5" />} onClick={() => archive(product)}>Archive</Button></>}</div>
            </div>)}</div>}
          </Card>
        </>
      )}
    </div>
  );
};