"use client";

import { useAppContext } from '@/context/AppContext';
import { ProductList } from '@/components/planly/products/ProductList';

export default function ProductsPage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <ProductList siteId={siteId} />
    </div>
  );
}
