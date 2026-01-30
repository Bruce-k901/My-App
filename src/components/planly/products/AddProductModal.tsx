'use client';

import { useState } from 'react';
import { X, Loader2, AlertCircle, Package, Settings, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Label from '@/components/ui/Label';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { useStocklyProducts } from '@/hooks/planly/useStocklyProducts';
import { useCategories } from '@/hooks/planly/useCategories';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useProcessTemplates } from '@/hooks/planly/useProcessTemplates';
import { cn } from '@/lib/utils';
import { mutate } from 'swr';
import type { ShipState, TrayType, PlanlyProduct } from '@/types/planly';

interface AddProductModalProps {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (product: PlanlyProduct) => void;
}

type TabId = 'product' | 'production' | 'pricing';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'product', label: 'Product', icon: Package },
  { id: 'production', label: 'Production', icon: Settings },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
];

export function AddProductModal({ siteId, isOpen, onClose, onSuccess }: AddProductModalProps) {
  const { data: stocklyProducts, isLoading: loadingStockly } = useStocklyProducts(siteId);
  const { data: categories } = useCategories(siteId);
  const { data: bakeGroups } = useBakeGroups(siteId);
  const { data: processTemplates } = useProcessTemplates(siteId);

  const [activeTab, setActiveTab] = useState<TabId>('product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Product tab
  const [stocklyProductId, setStocklyProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isNew, setIsNew] = useState(false);

  // Production tab
  const [processTemplateId, setProcessTemplateId] = useState('');
  const [bakeGroupId, setBakeGroupId] = useState('');
  const [itemsPerTray, setItemsPerTray] = useState('12');
  const [trayType, setTrayType] = useState<TrayType>('full');
  const [canShipFrozen, setCanShipFrozen] = useState(true);
  const [defaultShipState, setDefaultShipState] = useState<ShipState>('baked');

  // Pricing tab
  const [isVatable, setIsVatable] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [listPrice, setListPrice] = useState('');

  // Safely handle stocklyProducts - ensure it's an array
  const stocklyProductsList = Array.isArray(stocklyProducts) ? stocklyProducts : [];

  const selectedProduct = stocklyProductsList.find(p => p.id === stocklyProductId);
  const availableProducts = stocklyProductsList.filter(p => !p.is_linked);
  const filteredProducts = availableProducts.filter(
    p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stocklyProductId) {
      setError('Please select a product');
      setActiveTab('product');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const productData = {
        stockly_product_id: stocklyProductId,
        category_id: categoryId || null,
        description: description.trim() || null,
        is_new: isNew,
        is_paused: false,
        process_template_id: processTemplateId || null,
        bake_group_id: bakeGroupId || null,
        items_per_tray: parseInt(itemsPerTray) || 12,
        tray_type: trayType,
        can_ship_frozen: canShipFrozen,
        default_ship_state: defaultShipState,
        is_vatable: isVatable,
        vat_rate: isVatable ? parseFloat(vatRate) || 20 : null,
        is_active: true,
        site_id: siteId,
      };

      const res = await fetch('/api/planly/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create product');
      }

      const product = await res.json();

      // If list price is provided, create it
      if (listPrice) {
        await fetch(`/api/planly/products/${product.id}/prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            list_price: parseFloat(listPrice),
            effective_from: new Date().toISOString().split('T')[0],
          }),
        });
      }

      // Invalidate caches
      mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
      mutate(`/api/planly/stockly-products?siteId=${siteId}`);

      onSuccess?.(product);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setStocklyProductId('');
    setCategoryId('');
    setDescription('');
    setIsNew(false);
    setProcessTemplateId('');
    setBakeGroupId('');
    setItemsPerTray('12');
    setTrayType('full');
    setCanShipFrozen(true);
    setDefaultShipState('baked');
    setIsVatable(true);
    setVatRate('20');
    setListPrice('');
    setSearchQuery('');
    setActiveTab('product');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Product to Planly
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-[#14B8A6] text-[#14B8A6]'
                    : 'border-transparent text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[calc(90vh-220px)] overflow-y-auto">
            {/* Product Tab */}
            {activeTab === 'product' && (
              <div className="space-y-4">
                {/* Stockly Product Selection */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Select Product *</Label>
                  <p className="text-sm text-gray-500 dark:text-white/50 mb-2">
                    Choose a product from your Stockly inventory
                  </p>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Product List */}
                  <div className="border border-gray-200 dark:border-white/10 rounded-lg max-h-48 overflow-y-auto">
                    {loadingStockly ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-white/50">
                        {searchQuery ? 'No products match your search' : 'No available products'}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setStocklyProductId(product.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-left border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors',
                            stocklyProductId === product.id
                              ? 'bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20'
                              : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                          )}
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            {product.sku && (
                              <div className="text-xs text-gray-500 dark:text-white/50">
                                SKU: {product.sku}
                              </div>
                            )}
                          </div>
                          {stocklyProductId === product.id && (
                            <div className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {selectedProduct && (
                    <div className="mt-2 p-2 bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20 rounded-lg">
                      <span className="text-sm text-[#14B8A6]">
                        Selected: {selectedProduct.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Category</Label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                  >
                    <option value="" className="bg-white dark:bg-neutral-900">No category</option>
                    {(categories || []).map((cat: any) => (
                      <option key={cat.id} value={cat.id} className="bg-white dark:bg-neutral-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Portal Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Marketing description shown on the customer portal..."
                    className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>

                {/* Is New Badge */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(e) => setIsNew(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Show "New!" Badge</span>
                    <p className="text-sm text-gray-500 dark:text-white/60">Highlight this as a new product on the portal</p>
                  </div>
                </label>
              </div>
            )}

            {/* Production Tab */}
            {activeTab === 'production' && (
              <div className="space-y-4">
                {/* Process Template */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Process Template</Label>
                  <select
                    value={processTemplateId}
                    onChange={(e) => setProcessTemplateId(e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                  >
                    <option value="" className="bg-white dark:bg-neutral-900">No template</option>
                    {(processTemplates || []).map((template: any) => (
                      <option key={template.id} value={template.id} className="bg-white dark:bg-neutral-900">
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bake Group */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Bake Group</Label>
                  <select
                    value={bakeGroupId}
                    onChange={(e) => setBakeGroupId(e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                  >
                    <option value="" className="bg-white dark:bg-neutral-900">No bake group</option>
                    {(bakeGroups || []).map((group: any) => (
                      <option key={group.id} value={group.id} className="bg-white dark:bg-neutral-900">
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tray Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-white/80">Items Per Tray</Label>
                    <Input
                      type="number"
                      min="1"
                      value={itemsPerTray}
                      onChange={(e) => setItemsPerTray(e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-white/80">Tray Type</Label>
                    <select
                      value={trayType}
                      onChange={(e) => setTrayType(e.target.value as TrayType)}
                      className="mt-1 w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/50"
                    >
                      <option value="full" className="bg-white dark:bg-neutral-900">Full</option>
                      <option value="half" className="bg-white dark:bg-neutral-900">Half</option>
                      <option value="ring" className="bg-white dark:bg-neutral-900">Ring</option>
                    </select>
                  </div>
                </div>

                {/* Ship State */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">Default Ship State</Label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shipState"
                        checked={defaultShipState === 'baked'}
                        onChange={() => setDefaultShipState('baked')}
                        className="w-4 h-4 text-[#14B8A6] bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06]"
                      />
                      <span className="text-gray-900 dark:text-white">Baked (Fresh)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shipState"
                        checked={defaultShipState === 'frozen'}
                        onChange={() => setDefaultShipState('frozen')}
                        className="w-4 h-4 text-[#14B8A6] bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06]"
                      />
                      <span className="text-gray-900 dark:text-white">Frozen</span>
                    </label>
                  </div>
                </div>

                {/* Can Ship Frozen */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <input
                    type="checkbox"
                    checked={canShipFrozen}
                    onChange={(e) => setCanShipFrozen(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Can Ship Frozen</span>
                    <p className="text-sm text-gray-500 dark:text-white/60">This product can be shipped in frozen state</p>
                  </div>
                </label>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                {/* List Price */}
                <div>
                  <Label className="text-gray-700 dark:text-white/80">List Price (GBP)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                    Default price for this product. Customer-specific prices can be set later.
                  </p>
                </div>

                {/* VAT Settings */}
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                  <input
                    type="checkbox"
                    checked={isVatable}
                    onChange={(e) => setIsVatable(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-50 dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">VAT Applicable</span>
                    <p className="text-sm text-gray-500 dark:text-white/60">This product is subject to VAT</p>
                  </div>
                </label>

                {isVatable && (
                  <div>
                    <Label className="text-gray-700 dark:text-white/80">VAT Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="mt-1 bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !stocklyProductId}
              className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Product'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
