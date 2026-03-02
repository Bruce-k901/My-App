'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Search,
  Loader2,
  Link2,
  Check,
  Package,
  AlertCircle,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siteId: string;
  processingGroupId: string;
  processingGroupName: string;
}

interface Product {
  id: string;
  stockly_product_id: string;
  name: string;
  base_prep_grams_per_unit: number | null;
  processing_group_id: string | null;
  processing_group_name: string | null;
}

export function ProductLinkModal({
  isOpen,
  onClose,
  onSuccess,
  siteId,
  processingGroupId,
  processingGroupName,
}: ProductLinkModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all products for the site
  useEffect(() => {
    if (isOpen && siteId) {
      fetchProducts();
    }
  }, [isOpen, siteId]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planly/products?siteId=${siteId}&archived=false`);
      if (res.ok) {
        const data = await res.json();
        // Map to our format with product name
        const mappedProducts: Product[] = (data || []).map((p: any) => ({
          id: p.id,
          stockly_product_id: p.stockly_product_id,
          name: p.stockly_product?.name || p.stockly_product?.ingredient_name || 'Unknown Product',
          base_prep_grams_per_unit: p.base_prep_grams_per_unit,
          processing_group_id: p.processing_group_id,
          processing_group_name: p.processing_group?.name || null,
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(query));
  }, [products, searchQuery]);

  // Separate into linked (to this group) and available
  const linkedProducts = filteredProducts.filter(p => p.processing_group_id === processingGroupId);
  const availableProducts = filteredProducts.filter(p => p.processing_group_id !== processingGroupId);

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  // Select all available
  const selectAllAvailable = () => {
    const newSelected = new Set(selectedIds);
    availableProducts.forEach(p => newSelected.add(p.id));
    setSelectedIds(newSelected);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Link selected products
  const handleLinkProducts = async () => {
    if (selectedIds.size === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/planly/processing-groups/${processingGroupId}/link-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Linked ${result.linked} products to ${processingGroupName}`);
        onSuccess();
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to link products');
      }
    } catch (error) {
      console.error('Error linking products:', error);
      toast.error('Failed to link products');
    } finally {
      setSaving(false);
    }
  };

  // Unlink a product
  const handleUnlinkProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/planly/processing-groups/${processingGroupId}/link-products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: [productId] }),
      });

      if (res.ok) {
        toast.success('Product unlinked');
        fetchProducts(); // Refresh the list
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to unlink product');
      }
    } catch (error) {
      console.error('Error unlinking product:', error);
      toast.error('Failed to unlink product');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-module-fg" />
            Link Products to "{processingGroupName}"
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-theme-tertiary" />
            </div>
          ) : (
            <>
              {/* Currently linked products */}
              {linkedProducts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-theme-secondary mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Currently Linked ({linkedProducts.length})
                  </h4>
                  <div className="space-y-1">
                    {linkedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-theme-primary">
                            {product.name}
                          </span>
                          {product.base_prep_grams_per_unit && (
                            <span className="text-xs text-theme-tertiary">
                              ({product.base_prep_grams_per_unit}g/unit)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkProduct(product.id)}
                          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Unlink
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available products */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-theme-secondary flex items-center gap-2">
                    <Package className="h-4 w-4 text-theme-tertiary" />
                    Available Products ({availableProducts.length})
                  </h4>
                  {availableProducts.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllAvailable}
                        className="text-xs text-module-fg hover:text-module-fg/80"
                      >
                        Select all
                      </button>
                      {selectedIds.size > 0 && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="text-xs text-theme-tertiary hover:text-theme-secondary"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {availableProducts.length === 0 ? (
                  <div className="text-center py-4 text-theme-tertiary text-sm">
                    {searchQuery ? 'No products match your search' : 'All products are already linked'}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {availableProducts.map((product) => {
                      const isSelected = selectedIds.has(product.id);
                      const isInAnotherGroup = product.processing_group_id && product.processing_group_id !== processingGroupId;

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-left',
                            isSelected
                              ? 'bg-module-fg/10 border-module-fg/30 dark:bg-module-fg/20 dark:border-module-fg/40'
                              : 'bg-theme-surface border-theme hover:bg-theme-surface-elevated dark:hover:bg-white/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'bg-module-fg border-module-fg'
                                  : 'border-gray-300 dark:border-white/30'
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 text-theme-primary" />}
                            </div>
                            <span className="text-sm font-medium text-theme-primary">
                              {product.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.base_prep_grams_per_unit && (
                              <span className="text-xs text-theme-tertiary">
                                {product.base_prep_grams_per_unit}g/unit
                              </span>
                            )}
                            {isInAnotherGroup && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                in {product.processing_group_name}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-theme pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-theme-tertiary">
              {selectedIds.size > 0
                ? `${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''} selected`
                : 'Select products to link'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkProducts}
                disabled={saving || selectedIds.size === 0}
                className="bg-module-fg hover:bg-module-fg/90 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Link {selectedIds.size > 0 ? selectedIds.size : ''} Product{selectedIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
