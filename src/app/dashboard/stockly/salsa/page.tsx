// @salsa - SALSA Compliance: Audit readiness dashboard page
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import SALSAAuditSummary from '@/components/stockly/SALSAAuditSummary';
import { Printer, BookOpen } from '@/components/ui/icons';
import Link from 'next/link';

export default function SALSADashboardPage() {
  const { companyId, siteId } = useAppContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // @salsa — Fetch audit summary data
  useEffect(() => {
    if (!companyId) return;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ company_id: companyId });
        if (siteId && siteId !== 'all') params.append('site_id', siteId);

        const res = await fetch(`/api/stockly/salsa/audit-summary?${params}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Failed to fetch SALSA audit summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [companyId, siteId]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary print:text-black">SALSA Audit Readiness</h1>
          {lastUpdated && (
            <p className="text-sm text-theme-tertiary mt-1 print:text-gray-600">
              Last updated: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Link
            href="/dashboard/stockly/salsa/guide"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stockly-dark dark:text-stockly bg-stockly-dark/10 dark:bg-stockly/10 rounded-lg hover:bg-stockly-dark/20 dark:hover:bg-stockly/20 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            View Guide
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stockly-dark dark:text-stockly bg-stockly-dark/10 dark:bg-stockly/10 rounded-lg hover:bg-stockly-dark/20 dark:hover:bg-stockly/20 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-40 bg-theme-surface border border-theme rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <SALSAAuditSummary data={data} />
      ) : (
        <div className="text-center py-12 text-theme-tertiary">
          <p>Unable to load SALSA audit summary. Please try again.</p>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-600 { color: #4b5563 !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .print\\:gap-2 { gap: 0.5rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          nav, aside, header, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
