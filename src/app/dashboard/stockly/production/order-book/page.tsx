"use client";

import { Package, Loader2 } from '@/components/ui/icons';

export default function OrderBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Order Book</h1>
        <p className="text-theme-tertiary text-sm mt-1">
          View and manage customer orders
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-theme-primary font-medium mb-2">Order Book</h3>
        <p className="text-theme-tertiary text-sm">
          Order book view coming soon. This will show all customer orders with filtering and search.
        </p>
      </div>
    </div>
  );
}

