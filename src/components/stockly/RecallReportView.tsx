// @salsa - SALSA Compliance: Print-friendly recall report view
'use client';

import { useState, useEffect } from 'react';
import { Loader2, Printer } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';

interface RecallReportViewProps {
  recallId: string;
}

export default function RecallReportView({ recallId }: RecallReportViewProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      const res = await fetch(`/api/stockly/recalls/${recallId}/report`);
      const json = await res.json();
      if (json.success) setReport(json.data);
      setLoading(false);
    }
    fetchReport();
  }, [recallId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-stockly-dark dark:text-stockly" />
      </div>
    );
  }

  if (!report) return <p className="text-sm text-theme-tertiary py-4">Failed to load report</p>;

  const { recall, company_name, affected_batches, notifications, allergen_summary, mass_balance, timeline } = report;

  const severityLabels: Record<string, string> = {
    class_1: 'Class 1 — Serious health risk',
    class_2: 'Class 2 — May cause illness',
    class_3: 'Class 3 — Unlikely health risk',
  };

  return (
    <div className="space-y-4">
      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-theme text-theme-secondary hover:bg-theme-surface-elevated text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Report content (print-friendly) */}
      <div className="bg-white dark:bg-theme-surface rounded-lg border border-theme p-6 print:border-0 print:shadow-none print:p-0 space-y-6 print:text-black">
        {/* Header */}
        <div className="border-b-2 border-red-500 pb-4">
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 print:text-red-700">
            {recall.recall_type === 'withdrawal' ? 'Product Withdrawal' : 'Product Recall'} Report
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-theme-secondary print:text-gray-600">
            <span><strong>Code:</strong> {recall.recall_code}</span>
            <span><strong>Company:</strong> {company_name}</span>
            <span><strong>Severity:</strong> {severityLabels[recall.severity] || recall.severity}</span>
            <span><strong>Status:</strong> <span className="capitalize">{recall.status}</span></span>
          </div>
        </div>

        {/* Recall details */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Recall Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><strong>Title:</strong> {recall.title}</div>
            <div><strong>Type:</strong> {recall.recall_type === 'withdrawal' ? 'Withdrawal (trade level)' : 'Recall (consumer level)'}</div>
            <div className="col-span-2"><strong>Reason:</strong> {recall.reason || 'Not specified'}</div>
            {recall.description && <div className="col-span-2"><strong>Description:</strong> {recall.description}</div>}
          </div>
        </section>

        {/* Affected batches */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Affected Batches</h2>
          {affected_batches.length === 0 ? (
            <p className="text-sm text-theme-tertiary">No batches recorded</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Batch Code</th>
                  <th className="text-left py-2 px-2">Product</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-right py-2 px-2">Qty Affected</th>
                  <th className="text-right py-2 px-2">Qty Recovered</th>
                  <th className="text-left py-2 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {affected_batches.map((ab: any) => (
                  <tr key={ab.id} className="border-b border-gray-200">
                    <td className="py-1.5 px-2 font-mono">{ab.stock_batch?.batch_code || '-'}</td>
                    <td className="py-1.5 px-2">{ab.stock_batch?.stock_item?.name || '-'}</td>
                    <td className="py-1.5 px-2 capitalize">{ab.batch_type.replace('_', ' ')}</td>
                    <td className="py-1.5 px-2 text-right">{ab.quantity_affected ?? '-'}</td>
                    <td className="py-1.5 px-2 text-right">{ab.quantity_recovered ?? '-'}</td>
                    <td className="py-1.5 px-2 capitalize">{ab.action_taken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Allergen summary */}
        {allergen_summary.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Allergen Summary</h2>
            <div className="flex flex-wrap gap-2">
              {allergen_summary.map((a: string) => (
                <span key={a} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm print:border print:border-red-300">
                  {allergenKeyToLabel(a)}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Customer notifications */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Customer Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-theme-tertiary">No notifications recorded</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Contact</th>
                  <th className="text-left py-2 px-2">Method</th>
                  <th className="text-left py-2 px-2">Date Notified</th>
                  <th className="text-left py-2 px-2">Response</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n: any) => (
                  <tr key={n.id} className="border-b border-gray-200">
                    <td className="py-1.5 px-2">{n.customer_name}</td>
                    <td className="py-1.5 px-2">{n.contact_email || n.contact_phone || '-'}</td>
                    <td className="py-1.5 px-2 capitalize">{n.notification_method || '-'}</td>
                    <td className="py-1.5 px-2">{n.notified_at ? new Date(n.notified_at).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="py-1.5 px-2">{n.response_received ? 'Yes' : 'Awaiting'}{n.response_notes ? ` — ${n.response_notes}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Investigation */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Investigation</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div><strong>Root Cause:</strong> {recall.root_cause || 'Not yet identified'}</div>
            <div><strong>Corrective Actions:</strong> {recall.corrective_actions || 'Not yet documented'}</div>
          </div>
        </section>

        {/* Regulatory notifications */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Regulatory Notifications</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <strong>FSA Notified:</strong> {recall.fsa_notified ? 'Yes' : 'No'}
              {recall.fsa_notified_at && ` — ${new Date(recall.fsa_notified_at).toLocaleDateString('en-GB')}`}
              {recall.fsa_reference && ` (Ref: ${recall.fsa_reference})`}
            </div>
            <div>
              <strong>SALSA Notified:</strong> {recall.salsa_notified ? 'Yes' : 'No'}
              {recall.salsa_notified_at && ` — ${new Date(recall.salsa_notified_at).toLocaleDateString('en-GB')}`}
            </div>
          </div>
        </section>

        {/* Mass balance */}
        <section>
          <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Mass Balance</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><strong>Total Affected:</strong> {mass_balance.total_produced}</div>
            <div><strong>Total Recovered:</strong> {mass_balance.total_recovered}</div>
            <div><strong>Unaccounted:</strong> {mass_balance.unaccounted}</div>
          </div>
        </section>

        {/* Timeline */}
        {timeline.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-theme-primary print:text-black mb-2">Timeline</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {timeline.map((t: any, i: number) => (
                <div key={i}>
                  <strong>{t.label}:</strong> {new Date(t.date).toLocaleString('en-GB')}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-xs text-theme-tertiary print:text-gray-500">
          <p>Report generated: {new Date().toLocaleString('en-GB')}</p>
          <p>This report is confidential and intended for internal use and SALSA audit purposes only.</p>
        </div>
      </div>
    </div>
  );
}
