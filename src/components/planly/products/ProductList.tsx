'use client';

import { useState } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useProducts } from '@/hooks/planly/useProducts';
import { PlanlyProduct } from '@/types/planly';
import Link from 'next/link';

interface ProductListProps {
  siteId: string;
}

export function ProductList({ siteId }: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: products, isLoading, error } = useProducts(siteId, true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading products</div>
      </div>
    );
  }

  const filteredProducts = (products as PlanlyProduct[] || []).filter((product) =>
    product.stockly_product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.stockly_product?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <Link href="/dashboard/planly/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/[0.06] text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Link key={product.id} href={`/dashboard/planly/products/${product.id}`}>
            <Card className="p-4 hover:border-[#14B8A6]/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">
                    {product.stockly_product?.name || 'Unknown Product'}
                  </h3>
                  {product.stockly_product?.sku && (
                    <div className="text-xs text-white/40 mb-2">SKU: {product.stockly_product.sku}</div>
                  )}
                </div>
                <Package className="h-5 w-5 text-[#14B8A6] flex-shrink-0" />
              </div>

              <div className="space-y-1 text-sm text-white/60">
                {product.category && (
                  <div>Category: {product.category.name}</div>
                )}
                {product.bake_group && (
                  <div>Bake Group: {product.bake_group.name}</div>
                )}
                <div>Items per tray: {product.items_per_tray}</div>
                <div>Tray type: {product.tray_type}</div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/10">
                <span className={`text-xs px-2 py-1 rounded ${
                  product.is_active
                    ? 'bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30'
                    : 'bg-white/10 text-white/60 border border-white/20'
                }`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-white/60">
            {searchQuery ? 'No products match your search' : 'No products configured yet'}
          </div>
        </Card>
      )}
    </div>
  );
}
