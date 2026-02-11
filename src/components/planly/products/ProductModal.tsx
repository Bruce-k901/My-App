'use client';

import { useState, useEffect } from 'react';
import {
  Package, Sparkles, PauseCircle, Truck, Snowflake,
  Loader2, X, Search, Settings, DollarSign, ChevronDown, ChevronUp
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import Switch from '@/components/ui/Switch';
import { useCategories } from '@/hooks/planly/useCategories';
import { useBakeGroups } from '@/hooks/planly/useBakeGroups';
import { useProcessTemplates } from '@/hooks/planly/useProcessTemplates';
import { useProcessingGroups } from '@/hooks/planly/useProcessingGroups';
import { useEquipmentTypes } from '@/hooks/planly/useEquipmentTypes';
import { cn } from '@/lib/utils';
import { mutate } from 'swr';
import type { PlanlyProduct, ShipState } from '@/types/planly';

interface ProductModalProps {
  siteId: string;
  isOpen: boolean;
  onClose: () => void;
  editingProduct?: PlanlyProduct | null;
  onSuccess?: () => void;
}

interface StocklyProduct {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  is_linked?: boolean;
}

export function ProductModal({
  siteId,
  isOpen,
  onClose,
  editingProduct,
  onSuccess,
}: ProductModalProps) {
  const isEditing = !!editingProduct;

  // Fetch dropdown data
  const { data: categories } = useCategories(siteId);
  const { data: bakeGroups } = useBakeGroups(siteId);
  const { data: processTemplates } = useProcessTemplates(siteId);
  const { processingGroups, isLoading: processingGroupsLoading } = useProcessingGroups(siteId, { includeCompanyWide: true });
  const { equipmentTypes } = useEquipmentTypes(siteId, { includeCompanyWide: true });

  // Debug: Log processing groups data
  console.log('[ProductModal] siteId:', siteId, 'processingGroups:', processingGroups?.length, 'loading:', processingGroupsLoading);

  // Form state - Product tab
  const [stocklyProductId, setStocklyProductId] = useState('');
  const [stocklyProductName, setStocklyProductName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Form state - Production tab
  const [processTemplateId, setProcessTemplateId] = useState('');
  const [bakeGroupId, setBakeGroupId] = useState('');
  const [itemsPerTray, setItemsPerTray] = useState('12');
  const [canShipFrozen, setCanShipFrozen] = useState(true);
  const [defaultShipState, setDefaultShipState] = useState<ShipState>('baked');
  // Opsly production fields
  const [processingGroupId, setProcessingGroupId] = useState('');
  const [basePrepGramsPerUnit, setBasePrepGramsPerUnit] = useState('');
  const [equipmentTypeId, setEquipmentTypeId] = useState('');
  const [itemsPerEquipment, setItemsPerEquipment] = useState('');
  const [displayOrder, setDisplayOrder] = useState('');

  // Form state - Pricing tab
  const [isVatable, setIsVatable] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [listPrice, setListPrice] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stocklyProducts, setStocklyProducts] = useState<StocklyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get product name helper
  const getProductName = (product: PlanlyProduct) => {
    return product.stockly_product?.ingredient_name ||
           product.stockly_product?.name ||
           stocklyProductName ||
           'Unknown Product';
  };

  // Load form data when editing
  useEffect(() => {
    if (isOpen && editingProduct) {
      setStocklyProductId(editingProduct.stockly_product_id || '');
      setStocklyProductName(getProductName(editingProduct));
      setCategoryId(editingProduct.category_id || '');
      setDescription(editingProduct.description || '');
      setIsNew(editingProduct.is_new || false);
      setIsPaused(editingProduct.is_paused || false);
      setProcessTemplateId(editingProduct.process_template_id || '');
      setBakeGroupId(editingProduct.bake_group_id || '');
      setItemsPerTray(String(editingProduct.items_per_tray || 12));
      setCanShipFrozen(editingProduct.can_ship_frozen ?? true);
      setDefaultShipState(editingProduct.default_ship_state || 'baked');
      setIsVatable(editingProduct.is_vatable ?? true);
      setVatRate(String(editingProduct.vat_rate || 20));
      // Opsly production fields
      setProcessingGroupId(editingProduct.processing_group_id || '');
      setBasePrepGramsPerUnit(editingProduct.base_prep_grams_per_unit ? String(editingProduct.base_prep_grams_per_unit) : '');
      setEquipmentTypeId(editingProduct.equipment_type_id || '');
      setItemsPerEquipment(editingProduct.items_per_equipment ? String(editingProduct.items_per_equipment) : '');
      setDisplayOrder(editingProduct.display_order ? String(editingProduct.display_order) : '');

      // Load current list price if available
      const currentPrice = editingProduct.list_prices?.[0]?.list_price;
      setListPrice(currentPrice ? String(currentPrice) : '');
    } else if (isOpen && !editingProduct) {
      // Reset for new product
      resetForm();
    }
  }, [editingProduct, isOpen]);

  // Load Stockly products for selector
  useEffect(() => {
    if (isOpen && siteId && !isEditing) {
      loadStocklyProducts();
    }
  }, [isOpen, siteId, isEditing]);

  const resetForm = () => {
    setStocklyProductId('');
    setStocklyProductName('');
    setCategoryId('');
    setDescription('');
    setIsNew(false);
    setIsPaused(false);
    setProcessTemplateId('');
    setBakeGroupId('');
    setItemsPerTray('12');
    setCanShipFrozen(true);
    setDefaultShipState('baked');
    setIsVatable(true);
    setVatRate('20');
    setListPrice('');
    setSearchQuery('');
    setError(null);
    // Reset Opsly production fields
    setProcessingGroupId('');
    setBasePrepGramsPerUnit('');
    setEquipmentTypeId('');
    setItemsPerEquipment('');
    setDisplayOrder('');
  };

  const loadStocklyProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`/api/planly/stockly-products?siteId=${siteId}`);
      if (res.ok) {
        const data = await res.json();
        setStocklyProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load Stockly products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async () => {
    if (!stocklyProductId) {
      setError('Please select a product');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        site_id: siteId,
        stockly_product_id: stocklyProductId,
        category_id: categoryId || null,
        description: description.trim() || null,
        is_new: isNew,
        is_paused: isPaused,
        process_template_id: processTemplateId || null,
        bake_group_id: bakeGroupId || null,
        items_per_tray: parseInt(itemsPerTray) || 12,
        can_ship_frozen: canShipFrozen,
        default_ship_state: defaultShipState,
        is_vatable: isVatable,
        vat_rate: isVatable ? parseFloat(vatRate) || 20 : null,
        is_active: true,
        // Opsly production fields
        processing_group_id: processingGroupId || null,
        base_prep_grams_per_unit: basePrepGramsPerUnit ? parseFloat(basePrepGramsPerUnit) : null,
        equipment_type_id: equipmentTypeId || null,
        items_per_equipment: itemsPerEquipment ? parseInt(itemsPerEquipment) : null,
        display_order: displayOrder ? parseInt(displayOrder) : null,
      };

      const url = isEditing
        ? `/api/planly/products/${editingProduct!.id}`
        : '/api/planly/products';

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save product');
      }

      const product = await res.json();

      // Handle list price - create or update
      if (listPrice) {
        const priceValue = parseFloat(listPrice);
        const existingPrice = editingProduct?.list_prices?.[0];

        // Only update if price has changed or is new
        if (!existingPrice || existingPrice.list_price !== priceValue) {
          await fetch(`/api/planly/products/${product.id}/prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              list_price: priceValue,
              effective_from: new Date().toISOString().split('T')[0],
            }),
          });
        }
      }

      // Invalidate caches
      mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
      mutate(`/api/planly/products?siteId=${siteId}&archived=true`);
      mutate(`/api/planly/stockly-products?siteId=${siteId}`);

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Filter products based on search and exclude already linked
  const availableProducts = stocklyProducts.filter(p => !p.is_linked);
  const filteredProducts = searchQuery
    ? availableProducts.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableProducts;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-[#14B8A6]" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Product' : 'Add Product'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-white/60">
                {isEditing
                  ? 'Update product settings for wholesale ordering'
                  : 'Add a product to your wholesale portal'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Content - 2x2 Card Grid */}
        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Card 1: Product Details */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-[#14B8A6]" />
                <h3 className="font-medium text-gray-900 dark:text-white">Product Details</h3>
              </div>
              <div className="space-y-4">
                {/* Product Selector (only for new) */}
                {!isEditing ? (
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-white/80">Product *</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="border border-gray-200 dark:border-white/10 rounded-lg max-h-32 overflow-y-auto">
                      {loadingProducts ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-white/50 text-sm">
                          {searchQuery ? 'No products match' : 'No available products'}
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setStocklyProductId(product.id);
                              setStocklyProductName(product.name || `Product ${product.id.slice(0, 8)}`);
                            }}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 text-left border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors text-sm',
                              stocklyProductId === product.id
                                ? 'bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20'
                                : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                            )}
                          >
                            <span className="font-medium text-gray-900 dark:text-white">
                              {product.name || `Product ${product.id.slice(0, 8)}`}
                            </span>
                            {stocklyProductId === product.id && (
                              <div className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {stocklyProductId && (
                      <div className="p-3 bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20 rounded-lg border border-[#14B8A6]/30">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#14B8A6]" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {stocklyProductName || 'Product Selected'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-white/80">Product</Label>
                    <div className="p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {stocklyProductName || 'Unknown Product'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Category</Label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">No category</option>
                    {(categories || []).map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Marketing description for customers..."
                    rows={2}
                    className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Production Settings */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4 text-[#14B8A6]" />
                <h3 className="font-medium text-gray-900 dark:text-white">Production Settings</h3>
              </div>
              <div className="space-y-4">
                {/* Processing Group (Essential) */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">
                    Processing Group
                    {processingGroupsLoading && <span className="ml-2 text-xs text-gray-400">(loading...)</span>}
                    {!processingGroupsLoading && processingGroups.length === 0 && (
                      <span className="ml-2 text-xs text-amber-500">(none configured)</span>
                    )}
                  </Label>
                  <select
                    value={processingGroupId}
                    onChange={(e) => setProcessingGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                    disabled={processingGroupsLoading}
                  >
                    <option value="">
                      {processingGroupsLoading
                        ? 'Loading...'
                        : processingGroups.length === 0
                          ? 'No processing groups available'
                          : 'Select processing group'}
                    </option>
                    {processingGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                        {g.process_template?.name ? ` (${g.process_template.name})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-white/40">
                    Links this product to a dough/prep recipe for batch calculations
                    {processingGroups.length === 0 && !processingGroupsLoading && (
                      <span className="text-amber-500"> — Create groups in Settings → Dough & Prep</span>
                    )}
                  </p>
                </div>

                {/* Base Prep Per Unit (Essential) */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Base Prep/Unit (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={basePrepGramsPerUnit}
                    onChange={(e) => setBasePrepGramsPerUnit(e.target.value)}
                    placeholder="e.g., 80"
                    className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-white/40">
                    Grams of dough/prep needed per finished unit
                  </p>
                </div>

                {/* Bake Group (Essential) */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Bake Group</Label>
                  <select
                    value={bakeGroupId}
                    onChange={(e) => setBakeGroupId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">No bake group</option>
                    {(bakeGroups || []).map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Items/Tray (Essential) */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Items/Tray</Label>
                  <Input
                    type="number"
                    min="1"
                    value={itemsPerTray}
                    onChange={(e) => setItemsPerTray(e.target.value)}
                    className="w-24 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Advanced Settings Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
                >
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </button>

                {/* Advanced Settings (Collapsed by default) */}
                {showAdvanced && (
                  <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-white/10">
                    {/* Process Template */}
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-white/80">Process Template</Label>
                      <select
                        value={processTemplateId}
                        onChange={(e) => setProcessTemplateId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">No template</option>
                        {(processTemplates || []).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Equipment Type & Items */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-white/80">Equipment Type</Label>
                        <select
                          value={equipmentTypeId}
                          onChange={(e) => setEquipmentTypeId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">None</option>
                          {equipmentTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-white/80">Items/Equipment</Label>
                        <Input
                          type="number"
                          min="1"
                          value={itemsPerEquipment}
                          onChange={(e) => setItemsPerEquipment(e.target.value)}
                          placeholder="Default"
                          className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Display Order */}
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-white/80">Display Order</Label>
                      <Input
                        type="number"
                        min="0"
                        value={displayOrder}
                        onChange={(e) => setDisplayOrder(e.target.value)}
                        placeholder="e.g., 10"
                        className="w-24 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Shipping & Display */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-[#14B8A6]" />
                <h3 className="font-medium text-gray-900 dark:text-white">Shipping & Display</h3>
              </div>
              <div className="space-y-4">
                {/* Default Ship State */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">Default Ship State</Label>
                  <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDefaultShipState('baked')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors',
                        defaultShipState === 'baked'
                          ? 'bg-[#14B8A6] text-white'
                          : 'bg-white dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/10'
                      )}
                    >
                      <Truck className="h-4 w-4" />
                      Fresh
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultShipState('frozen')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-colors',
                        defaultShipState === 'frozen'
                          ? 'bg-[#14B8A6] text-white'
                          : 'bg-white dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/10'
                      )}
                    >
                      <Snowflake className="h-4 w-4" />
                      Frozen
                    </button>
                  </div>
                </div>

                {/* Can Ship Frozen */}
                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-900 dark:text-white">Can Ship Frozen</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={canShipFrozen}
                    onChange={(e) => setCanShipFrozen(e.target.checked)}
                    className="w-5 h-5 rounded bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                </label>

                {/* Show New Badge */}
                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-gray-900 dark:text-white">Show "New!" Badge</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={(e) => setIsNew(e.target.checked)}
                    className="w-5 h-5 rounded bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                </label>

                {/* Pause Ordering */}
                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-900 dark:text-white">Pause Ordering</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPaused}
                    onChange={(e) => setIsPaused(e.target.checked)}
                    className="w-5 h-5 rounded bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                </label>

                {isPaused && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <p className="text-amber-700 dark:text-amber-400 text-sm">
                      Product will be hidden from portal
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 4: Pricing */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-4 w-4 text-[#14B8A6]" />
                <h3 className="font-medium text-gray-900 dark:text-white">Pricing</h3>
              </div>
              <div className="space-y-4">
                {/* List Price */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-white/80">List Price (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0.00"
                    className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-white/40">
                    {isEditing ? 'Update the default list price' : 'Default price. Customer prices can be set later.'}
                  </p>
                </div>

                {/* VAT Toggle */}
                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer">
                  <span className="text-sm text-gray-900 dark:text-white">VAT Applicable</span>
                  <input
                    type="checkbox"
                    checked={isVatable}
                    onChange={(e) => setIsVatable(e.target.checked)}
                    className="w-5 h-5 rounded bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-[#14B8A6] focus:ring-[#14B8A6]/50"
                  />
                </label>

                {/* VAT Rate */}
                {isVatable && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-white/80">VAT Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={vatRate}
                      onChange={(e) => setVatRate(e.target.value)}
                      className="w-24 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
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
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !stocklyProductId}
            className="bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? 'Saving...' : 'Adding...'}
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Add Product'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
