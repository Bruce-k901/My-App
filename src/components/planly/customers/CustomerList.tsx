'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
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
        <div className="text-white/60">Loading customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Error loading customers</div>
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
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <Link href="/dashboard/planly/customers/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
        <Input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/[0.06] text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Link key={customer.id} href={`/dashboard/planly/customers/${customer.id}`}>
            <Card className="p-4 hover:border-[#14B8A6]/50 transition-colors cursor-pointer">
              <h3 className="font-semibold text-white mb-2">{customer.name}</h3>
              {customer.contact_name && (
                <div className="text-sm text-white/60 mb-1">{customer.contact_name}</div>
              )}
              {customer.email && (
                <div className="text-sm text-white/60 mb-1">{customer.email}</div>
              )}
              {customer.phone && (
                <div className="text-sm text-white/60">{customer.phone}</div>
              )}
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className={`text-xs px-2 py-1 rounded ${
                  customer.is_active
                    ? 'bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30'
                    : 'bg-white/10 text-white/60 border border-white/20'
                }`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-white/60">
            {searchQuery ? 'No customers match your search' : 'No customers yet'}
          </div>
        </Card>
      )}
    </div>
  );
}
