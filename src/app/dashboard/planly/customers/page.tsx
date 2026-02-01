"use client";

import { useAppContext } from '@/context/AppContext';
import { CustomerList } from '@/components/planly/customers/CustomerList';

export default function CustomersPage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <CustomerList siteId={siteId} />
    </div>
  );
}
