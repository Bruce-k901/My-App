'use client';

import { BulkUploadWizard } from '@/components/teamly/bulk-upload/BulkUploadWizard';

export default function BulkUploadPage() {
  return (
    <div className="min-h-screen bg-theme-surface p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-theme-primary mb-2">Bulk Upload Team Members</h1>
        <p className="text-theme-secondary mb-8">
          Import employees from a CSV or Excel file into Teamly.
        </p>
        <BulkUploadWizard />
      </div>
    </div>
  );
}
