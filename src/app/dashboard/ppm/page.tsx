"use client";

import { PPMSchedulePage } from '@/components/ppm';
import { useAppContext } from '@/context/AppContext';

export default function Page() {
  const { loading: authLoading, companyId } = useAppContext();

  if (authLoading) {
    return <div className="p-8 text-theme-primary">Loading...</div>;
  }

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Company Setup Required</h2>
          <p className="text-theme-secondary mb-4">Please complete your company setup to access this page.</p>
          <a href="/dashboard/business" className="inline-block px-4 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg transition-all duration-200">Complete Setup</a>
        </div>
      </div>
    );
  }

  return <PPMSchedulePage />;
}