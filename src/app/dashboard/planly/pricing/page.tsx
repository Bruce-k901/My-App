"use client";

import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useCustomers } from '@/hooks/planly/useCustomers';
import { useAppContext } from '@/context/AppContext';
import { PlanlyCustomer } from '@/types/planly';
import Link from 'next/link';

export default function PricingPage() {
  const { siteId } = useAppContext();
  const { data: customers, isLoading, error } = useCustomers(siteId, true);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60">Loading pricing data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading pricing data</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Product Pricing</h1>
        <p className="text-white/50 text-sm mt-1">
          Manage list prices and customer-specific pricing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(customers as PlanlyCustomer[] || []).map((customer) => (
          <Link key={customer.id} href={`/dashboard/planly/customers/${customer.id}`}>
            <Card className="p-4 hover:border-[#14B8A6]/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{customer.name}</h3>
                <DollarSign className="h-5 w-5 text-[#14B8A6] flex-shrink-0" />
              </div>
              <div className="text-sm text-white/60">
                {customer.prices?.length || 0} {customer.prices?.length === 1 ? 'price' : 'prices'} configured
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {(!customers || (customers as PlanlyCustomer[]).length === 0) && (
        <Card className="p-12 text-center">
          <div className="text-white/60">No customers yet</div>
        </Card>
      )}
    </div>
  );
}
