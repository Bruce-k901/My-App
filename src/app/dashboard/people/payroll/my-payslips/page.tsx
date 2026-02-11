'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Download,
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  DollarSign,
  Search,
  Filter,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import type { PayslipView } from '@/types/teamly';

export default function MyPayslipsPage() {
  const { profile, companyId } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<PayslipView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipView | null>(null);

  useEffect(() => {
    if (profile?.id && companyId) {
      fetchPayslips();
    }
  }, [profile?.id, companyId]);

  async function fetchPayslips() {
    if (!profile?.id || !companyId) return;
    
    setLoading(true);
    try {
      // Try to use the view first, fallback to direct table query
      const { data, error } = await supabase
        .from('payslips_view')
        .select('*')
        .eq('profile_id', profile.id)
        .order('period_start', { ascending: false });

      if (error) {
        // Fallback to direct query if view doesn't exist
        const { data: payslipData, error: payslipError } = await supabase
          .from('payslips')
          .select(`
            *,
            pay_periods!payslips_pay_period_id_fkey (
              period_start,
              period_end,
              pay_date
            ),
            profiles!payslips_profile_id_fkey (
              full_name,
              email,
              position_title
            )
          `)
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false });

        if (payslipError) throw payslipError;

        // Transform data to match PayslipView interface
        const transformedPayslips: PayslipView[] = (payslipData || []).map((p: any) => ({
          ...p,
          period_start: p.pay_periods?.period_start || p.created_at,
          period_end: p.pay_periods?.period_end || p.created_at,
          pay_date: p.pay_periods?.pay_date || p.created_at,
          employee_name: p.profiles?.full_name || profile.full_name || 'Unknown',
          employee_email: p.profiles?.email || profile.email || '',
          position_title: p.profiles?.position_title || profile.position_title || null,
          pay_type: 'hourly', // Default, could be enhanced
          base_rate: 0, // Could be enhanced
          gross_pay_pounds: (p.gross_pay || 0) / 100,
          net_pay_pounds: (p.net_pay || 0) / 100,
          tax_pounds: (p.tax_paye || 0) / 100,
          ni_pounds: (p.national_insurance || 0) / 100,
        }));

        setPayslips(transformedPayslips);
      } else {
        setPayslips(data as PayslipView[]);
      }
    } catch (error: any) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }

  const filteredPayslips = payslips.filter(payslip => {
    const matchesSearch = 
      payslip.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payslip.period_start?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payslip.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'approved':
        return 'bg-blue-500/20 text-blue-400';
      case 'calculated':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'draft':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleDownload = async (payslip: PayslipView) => {
    toast.info('Download feature coming soon');
    // TODO: Implement PDF generation and download
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D37E91]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/people/payroll">
              <Button variant="ghost" className="text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payroll
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Payslips</h1>
              <p className="text-gray-900 dark:text-white/60 text-sm">
                View and download your payslips
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-900 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search payslips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1A1D26] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1A1D26] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="calculated">Calculated</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Payslips Grid */}
        {filteredPayslips.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1D26] rounded-lg border border-gray-300 dark:border-white/10 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-900 dark:text-white/20 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white/60">
              {searchTerm || statusFilter !== 'all' 
                ? 'No payslips match your filters'
                : 'No payslips found. Payslips will appear here once they are generated.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayslips.map((payslip) => (
              <div
                key={payslip.id}
                className="bg-white dark:bg-[#1A1D26] rounded-lg border border-gray-300 dark:border-white/10 p-6 hover:border-[#D37E91]/50 transition-colors cursor-pointer"
                onClick={() => setSelectedPayslip(payslip)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-900 dark:text-white/40" />
                      <span className="text-sm text-gray-900 dark:text-white/60">
                        {formatDate(payslip.period_start)} - {formatDate(payslip.period_end)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-900 dark:text-white/40" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(payslip.net_pay_pounds || 0)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(payslip.status)}`}>
                    {payslip.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-gray-800 dark:text-white/80">
                    <span>Gross Pay:</span>
                    <span className="font-medium">{formatCurrency(payslip.gross_pay_pounds || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-white/60">
                    <span>Tax:</span>
                    <span>{formatCurrency(payslip.tax_pounds || 0)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-white/60">
                    <span>NI:</span>
                    <span>{formatCurrency(payslip.ni_pounds || 0)}</span>
                  </div>
                  {payslip.pay_date && (
                    <div className="flex justify-between text-gray-900 dark:text-white/60 text-xs pt-2 border-t border-gray-300 dark:border-white/10">
                      <span>Pay Date:</span>
                      <span>{formatDate(payslip.pay_date)}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(payslip);
                  }}
                  className="w-full text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Payslip Detail Modal */}
        {selectedPayslip && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPayslip(null)}
          >
            <div 
              className="bg-white dark:bg-[#1A1D26] rounded-lg border border-gray-300 dark:border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-300 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payslip Details</h2>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPayslip(null)}
                    className="text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm text-gray-900 dark:text-white/60 mb-2">Pay Period</h3>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedPayslip.period_start)} - {formatDate(selectedPayslip.period_end)}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm text-gray-900 dark:text-white/60 mb-2">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-900 dark:text-white">
                      <span>Gross Pay:</span>
                      <span className="font-medium">{formatCurrency(selectedPayslip.gross_pay_pounds || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-900 dark:text-white/60 mb-2">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-800 dark:text-white/80">
                      <span>Tax (PAYE):</span>
                      <span>{formatCurrency(selectedPayslip.tax_pounds || 0)}</span>
                    </div>
                    <div className="flex justify-between text-gray-800 dark:text-white/80">
                      <span>National Insurance:</span>
                      <span>{formatCurrency(selectedPayslip.ni_pounds || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-300 dark:border-white/10">
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                    <span>Net Pay:</span>
                    <span>{formatCurrency(selectedPayslip.net_pay_pounds || 0)}</span>
                  </div>
                </div>

                {selectedPayslip.pay_date && (
                  <div className="pt-4 border-t border-gray-300 dark:border-white/10">
                    <p className="text-sm text-gray-900 dark:text-white/60">
                      Pay Date: {formatDate(selectedPayslip.pay_date)}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-300 dark:border-white/10 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPayslip(null)}
                  className="text-gray-900 dark:text-white/60 hover:text-gray-900 dark:text-white"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleDownload(selectedPayslip)}
                  className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-600 dark:bg-blue-500/90 text-gray-900 dark:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
