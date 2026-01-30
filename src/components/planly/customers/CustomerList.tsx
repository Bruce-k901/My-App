'use client';

import { useState } from 'react';
import { Plus, Search, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCustomers } from '@/hooks/planly/useCustomers';
import { PlanlyCustomer } from '@/types/planly';
import Link from 'next/link';

interface CustomerListProps {
  siteId: string;
}

export function CustomerList({ siteId }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: customers, isLoading, error } = useCustomers(siteId, true);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Loading customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">Error loading customers</div>
      </div>
    );
  }

  const filteredCustomers = (customers as PlanlyCustomer[] || []).filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <Link href="/dashboard/planly/customers/new">
          <Button className="bg-[#14B8A6] hover:bg-[#0D9488] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
        <Input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Link key={customer.id} href={`/dashboard/planly/customers/${customer.id}`}>
            <Card className="p-4 bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-[#14B8A6]/50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                {customer.portal_enabled && (
                  <span title="Portal enabled">
                    <Globe className="h-4 w-4 text-[#14B8A6] flex-shrink-0" />
                  </span>
                )}
              </div>
              {customer.contact_name && (
                <div className="text-sm text-gray-600 dark:text-white/60 mb-1">{customer.contact_name}</div>
              )}
              {customer.email && (
                <div className="text-sm text-gray-600 dark:text-white/60 mb-1">{customer.email}</div>
              )}
              {customer.phone && (
                <div className="text-sm text-gray-600 dark:text-white/60">{customer.phone}</div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  customer.is_active
                    ? 'bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60 border border-gray-200 dark:border-white/20'
                }`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
                {customer.is_ad_hoc && (
                  <span className="text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    Ad-hoc
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="p-12 text-center bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <div className="text-gray-500 dark:text-white/60">
            {searchQuery ? 'No customers match your search' : 'No customers yet'}
          </div>
        </Card>
      )}
    </div>
  );
}
