'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/context/AppContext';
import { CustomerForm } from '@/components/planly/customers/CustomerForm';
import type { PlanlyCustomer } from '@/types/planly';
import Link from 'next/link';

interface CustomerPageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerPage({ params }: CustomerPageProps) {
  const { id } = use(params);
  const { siteId } = useAppContext();
  const router = useRouter();

  const [customer, setCustomer] = useState<PlanlyCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/planly/customers/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to load customer');
      }
      const data = await res.json();
      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-white/60">Please select a site</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-500 dark:text-red-400 mb-4">{error || 'Customer not found'}</div>
          <Link href="/dashboard/planly/customers">
            <Button variant="outline" className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] text-gray-700 dark:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard/planly/customers"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Customer</h1>
        <p className="text-gray-500 dark:text-white/60">{customer.name}</p>
      </div>
      <CustomerForm siteId={siteId} customer={customer} />
    </div>
  );
}
