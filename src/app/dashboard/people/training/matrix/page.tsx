'use client';

import dynamic from 'next/dynamic';

// Prevent SSR for this page to avoid React Client Manifest errors
const ComplianceMatrixPageClient = dynamic(
  () => import('./page-client').then(mod => ({ default: mod.ComplianceMatrixPageClient })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Loading...</div>
      </div>
    )
  }
);

export default function ComplianceMatrixPage() {
  return <ComplianceMatrixPageClient />;
}
