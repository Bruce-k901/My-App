// @salsa - SALSA Compliance: New recall page
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Shield, ArrowLeft } from '@/components/ui/icons';
import Link from 'next/link';
import RecallForm from '@/components/stockly/RecallForm';

export default function NewRecallPage() {
  const router = useRouter();
  const { companyId, siteId, userId } = useAppContext();
  const [loading, setLoading] = useState(false);

  async function handleCreate(data: {
    recall_code: string;
    title: string;
    description: string;
    recall_type: 'recall' | 'withdrawal';
    severity: 'class_1' | 'class_2' | 'class_3';
    reason: string;
  }) {
    setLoading(true);

    try {
      const res = await fetch('/api/stockly/recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          site_id: siteId && siteId !== 'all' ? siteId : null,
          ...data,
          initiated_by: userId,
          created_by: userId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        router.push(`/dashboard/stockly/recalls/${json.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create recall:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/stockly/recalls"
          className="flex items-center gap-1 text-sm text-theme-secondary hover:text-theme-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to recalls
        </Link>
        <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
          <Shield className="w-6 h-6 text-stockly-dark dark:text-stockly" />
          New Recall / Withdrawal
        </h1>
        <p className="text-sm text-theme-secondary mt-1">
          Initiate a product recall or withdrawal event
        </p>
      </div>

      {/* Form */}
      <div className="bg-theme-bg-primary border border-theme-border rounded-lg p-6">
        <RecallForm onSubmit={handleCreate} loading={loading} />
      </div>
    </div>
  );
}
