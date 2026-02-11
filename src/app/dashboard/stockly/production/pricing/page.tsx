"use client";

import { Tag, Loader2 } from '@/components/ui/icons';

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Product Pricing</h1>
        <p className="text-white/50 text-sm mt-1">
          Set and manage product pricing for customers
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
        <Tag className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h3 className="text-white font-medium mb-2">Product Pricing</h3>
        <p className="text-white/60 text-sm">
          Pricing management coming soon. Set customer-specific pricing for products and manage price lists.
        </p>
      </div>
    </div>
  );
}

