// @salsa - SALSA Compliance: Approved Supplier List report (print-friendly + CSV + PDF)
'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Download, Printer, FileText, Building2 } from '@/components/ui/icons';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { ApprovalStatusBadge, RiskRatingBadge } from '@/components/stockly/SupplierApprovalPanel';
import type { Supplier, SupplierApprovalStatus, RiskRating } from '@/lib/types/stockly';

export default function ApprovedSupplierListPage() {
  const { companyId } = useAppContext();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (companyId) fetchSuppliers();
  }, [companyId]);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      // @salsa — Fetch all active suppliers with approval data
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('approval_status')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }

  // @salsa — Export as CSV
  function exportCSV() {
    const headers = ['Name', 'Code', 'Approval Status', 'Risk Rating', 'Approved Date', 'Next Review', 'Contact', 'Phone', 'Email'];
    const rows = suppliers.map(s => [
      s.name,
      s.code || '',
      s.approval_status || 'pending',
      s.risk_rating || 'medium',
      s.approved_at ? new Date(s.approved_at).toLocaleDateString('en-GB') : '',
      s.next_review_date ? new Date(s.next_review_date).toLocaleDateString('en-GB') : '',
      s.contact_name || '',
      s.phone || '',
      s.email || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approved-supplier-list-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }

  // @salsa — Print (uses browser print, captures the table)
  function handlePrint() {
    window.print();
  }

  const approved = suppliers.filter(s => s.approval_status === 'approved');
  const conditional = suppliers.filter(s => s.approval_status === 'conditional');
  const pending = suppliers.filter(s => (s.approval_status || 'pending') === 'pending');
  const suspended = suppliers.filter(s => s.approval_status === 'suspended');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-secondary">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header — hidden on print */}
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href="/dashboard/stockly/suppliers"
              className="p-2 rounded-lg bg-theme-surface hover:bg-theme-muted border border-theme text-theme-secondary hover:text-theme-primary transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-theme-primary flex items-center gap-2">
                <FileText className="w-6 h-6 text-module-fg flex-shrink-0" />
                Approved Supplier List
              </h1>
              <p className="text-theme-secondary text-xs sm:text-sm mt-1">SALSA compliance report — auditor-ready</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} variant="outline" className="text-sm">
              <Download className="w-4 h-4 mr-1.5" />
              CSV
            </Button>
            <Button onClick={handlePrint} variant="outline" className="text-sm">
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
          </div>
        </div>

        {/* Summary Cards — hidden on print */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="bg-theme-surface border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{approved.length}</p>
            <p className="text-xs text-theme-tertiary">Approved</p>
          </div>
          <div className="bg-theme-surface border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{conditional.length}</p>
            <p className="text-xs text-theme-tertiary">Conditional</p>
          </div>
          <div className="bg-theme-surface border border-blue-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{pending.length}</p>
            <p className="text-xs text-theme-tertiary">Pending</p>
          </div>
          <div className="bg-theme-surface border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{suspended.length}</p>
            <p className="text-xs text-theme-tertiary">Suspended</p>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Approved Supplier List</h1>
          <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString('en-GB')} | Total suppliers: {suppliers.length}</p>
        </div>

        {/* @salsa — Supplier table */}
        <div ref={printRef} className="bg-theme-surface border border-theme rounded-xl overflow-hidden print:border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-theme-button print:bg-gray-100 border-b border-theme print:border-gray-300">
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Risk</th>
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Approved</th>
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Next Review</th>
                  <th className="text-left px-4 py-3 text-theme-secondary print:text-gray-600 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme print:divide-gray-200">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-theme-hover print:hover:bg-transparent">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-theme-primary print:text-black">{s.name}</p>
                        {s.code && <p className="text-xs text-theme-tertiary print:text-gray-500">{s.code}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="print:hidden">
                        <ApprovalStatusBadge status={s.approval_status as SupplierApprovalStatus} />
                      </span>
                      <span className="hidden print:inline text-xs">{s.approval_status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="print:hidden">
                        <RiskRatingBadge rating={s.risk_rating as RiskRating} />
                      </span>
                      <span className="hidden print:inline text-xs">{s.risk_rating || 'medium'}</span>
                    </td>
                    <td className="px-4 py-3 text-theme-secondary print:text-gray-600">
                      {s.approved_at ? new Date(s.approved_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-theme-secondary print:text-gray-600">
                      {s.next_review_date ? new Date(s.next_review_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-theme-secondary print:text-gray-600">
                        {s.contact_name && <p className="text-xs">{s.contact_name}</p>}
                        {s.phone && <p className="text-xs">{s.phone}</p>}
                        {s.email && <p className="text-xs truncate max-w-[150px]">{s.email}</p>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {suppliers.length === 0 && (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-theme-tertiary mx-auto mb-3" />
              <p className="text-theme-secondary text-sm">No suppliers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
