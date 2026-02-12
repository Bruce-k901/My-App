'use client';

import { useState } from 'react';
import { Plus, Search, Package, Archive, Sparkles, PauseCircle, RotateCcw } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import { useProducts } from '@/hooks/planly/useProducts';
import { PlanlyProduct } from '@/types/planly';
import { ProductModal } from './ProductModal';
import { cn } from '@/lib/utils';
import { mutate } from 'swr';

interface ProductListProps {
  siteId: string;
}

type TabType = 'active' | 'archived';

export function ProductList({ siteId }: ProductListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlanlyProduct | null>(null);

  const { data: products, isLoading, error } = useProducts(siteId, {
    archived: activeTab === 'archived'
  });

  const updateProduct = async (productId: string, updates: Partial<PlanlyProduct>) => {
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/planly/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        mutate(`/api/planly/products?siteId=${siteId}&archived=${activeTab === 'archived'}`);
      }
    } catch (err) {
      console.error('Error updating product:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const archiveProduct = async (productId: string) => {
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/planly/products/${productId}?archive=true`, {
        method: 'DELETE',
      });
      if (res.ok) {
        mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
        mutate(`/api/planly/products?siteId=${siteId}&archived=true`);
      }
    } catch (err) {
      console.error('Error archiving product:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const restoreProduct = async (productId: string) => {
    setUpdatingId(productId);
    try {
      const res = await fetch(`/api/planly/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_at: null }),
      });
      if (res.ok) {
        mutate(`/api/planly/products?siteId=${siteId}&archived=false`);
        mutate(`/api/planly/products?siteId=${siteId}&archived=true`);
      }
    } catch (err) {
      console.error('Error restoring product:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Safely handle products data - ensure it's an array
  const productsList = Array.isArray(products) ? products : [];

  // Helper to get product name from joined data
  const getProductName = (product: PlanlyProduct) => {
    return product.stockly_product?.ingredient_name ||
           product.stockly_product?.name ||
           product.category?.name ||
           'Unknown Product';
  };

  const filteredProducts = (productsList as PlanlyProduct[]).filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const productName = getProductName(product);
    return (
      productName.toLowerCase().includes(query) ||
      product.category?.name?.toLowerCase().includes(query) ||
      product.bake_group?.name?.toLowerCase().includes(query)
    );
  });

  // Handlers for modal
  const handleAddNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: PlanlyProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const tabs = [
    { id: 'active' as const, label: 'Active', icon: Package },
    { id: 'archived' as const, label: 'Archived', icon: Archive },
  ];

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-[#0B0F1A] -mx-4 px-4 pt-2 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-theme-primary">Products</h1>
          <Button
            onClick={handleAddNew}
            className="bg-[#14B8A6] hover:bg-[#0D9488] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Tabs - inside sticky header when content loaded */}
        {!isLoading && !error && (
          <>
            <div className="border-b border-theme">
              <nav className="flex space-x-4" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors',
                        isActive
                          ? 'border-[#14B8A6] text-[#14B8A6]'
                          : 'border-transparent text-theme-tertiary hover:text-theme-secondary hover:border-gray-300 dark:hover:border-white/30'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-tertiary" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-theme-surface border-theme text-theme-primary placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary"
              />
            </div>
          </>
        )}
      </div>

      {/* Product Modal - for both adding and editing */}
      {isModalOpen && (
        <ProductModal
          siteId={siteId}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          editingProduct={editingProduct}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-theme-tertiary">Loading products...</div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-12 text-center bg-theme-surface border-theme">
          <div className="text-red-500 dark:text-red-400">Error loading products. Please try again.</div>
        </Card>
      )}

      {/* Content - Only show when not loading and no error */}
      {!isLoading && !error && (
        <>
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className={cn(
              "p-4 bg-theme-surface border-theme transition-all",
              updatingId === product.id && "opacity-50"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-theme-primary truncate">
                    {getProductName(product)}
                  </h3>
                  {product.is_new && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded">
                      <Sparkles className="h-3 w-3" />
                      New!
                    </span>
                  )}
                  {product.is_paused && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded">
                      <PauseCircle className="h-3 w-3" />
                      Paused
                    </span>
                  )}
                </div>
                {product.stockly_product?.category && (
                  <div className="text-xs text-theme-tertiary mt-1">
                    {product.stockly_product.category}
                  </div>
                )}
              </div>
              <Package className="h-5 w-5 text-[#14B8A6] flex-shrink-0" />
            </div>

            {/* Product details */}
            <div className="space-y-1 text-sm text-theme-secondary mb-3">
              {product.category && (
                <div>Category: {product.category.name}</div>
              )}
              {product.bake_group && (
                <div>Bake Group: {product.bake_group.name}</div>
              )}
              <div>Items per tray: {product.items_per_tray}</div>
            </div>

            {/* Description if present */}
            {product.description && (
              <p className="text-sm text-theme-tertiary mb-3 line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Toggles & Actions */}
            {activeTab === 'active' ? (
              <div className="space-y-3 pt-3 border-t border-theme">
                {/* Toggle switches */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-secondary">Show "New!" badge</span>
                  <Switch
                    checked={product.is_new}
                    onChange={(checked) => updateProduct(product.id, { is_new: checked })}
                    disabled={updatingId === product.id}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-theme-secondary">Pause ordering</span>
                  <Switch
                    checked={product.is_paused}
                    onChange={(checked) => updateProduct(product.id, { is_paused: checked })}
                    disabled={updatingId === product.id}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                    className="bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-elevated dark:hover:bg-white/10"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archiveProduct(product.id)}
                    disabled={updatingId === product.id}
                    className="text-theme-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-3 border-t border-theme">
                <div className="text-xs text-theme-tertiary">
                  Archived {product.archived_at ? new Date(product.archived_at).toLocaleDateString() : ''}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreProduct(product.id)}
                  disabled={updatingId === product.id}
                  className="bg-theme-surface border-theme text-theme-secondary hover:bg-theme-surface-elevated dark:hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <Card className="p-12 text-center bg-theme-surface border-theme">
            <div className="text-theme-tertiary">
              {searchQuery
                ? 'No products match your search'
                : activeTab === 'archived'
                  ? 'No archived products'
                  : 'No products configured yet'}
            </div>
          </Card>
        )}
      </>
      )}
    </div>
  );
}
