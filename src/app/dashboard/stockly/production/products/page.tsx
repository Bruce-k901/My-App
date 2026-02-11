"use client";

import { Package, Loader2 } from '@/components/ui/icons';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Products</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage product catalog and link products to recipes
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Product Management</h3>
        <p className="text-white/60 text-sm">
          Product management coming soon. Add, edit, and remove products. Link products to recipes and production profiles.
        </p>
      </div>
    </div>
  );
}

