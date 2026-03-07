'use client';

import { useAppContext } from '@/context/AppContext';
import { CustomerForm } from '@/components/planly/customers/CustomerForm';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/icons';

export default function NewCustomerPage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard/planly/customers"
          className="inline-flex items-center gap-2 text-theme-tertiary hover:text-theme-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-theme-primary">Add Customer</h1>
        <p className="text-theme-tertiary">Create a new customer for orders</p>
      </div>
      <CustomerForm siteId={siteId} />
    </div>
  );
}
