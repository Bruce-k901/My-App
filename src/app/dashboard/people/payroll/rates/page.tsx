'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PayRate } from '@/types/teamly';

interface PayRateWithEmployee extends PayRate {
  employee_name: string;
  employee_email: string;
  position_title: string | null;
}

export default function PayRatesPage() {
  const { profile, companyId } = useAppContext();
  
  const [loading, setLoading] = useState(true);
  const [payRates, setPayRates] = useState<PayRateWithEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingRate, setEditingRate] = useState<PayRateWithEmployee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchPayRates();
    }
  }, [companyId]);

  async function fetchPayRates() {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pay_rates')
        .select(`
          *,
          profiles!pay_rates_profile_id_fkey (
            full_name,
            email,
            position_title
          )
        `)
        .eq('company_id', companyId)
        .order('effective_from', { ascending: false });

      if (error) throw error;

      const ratesWithEmployees: PayRateWithEmployee[] = (data || []).map((rate: any) => ({
        ...rate,
        employee_name: rate.profiles?.full_name || 'Unknown',
        employee_email: rate.profiles?.email || '',
        position_title: rate.profiles?.position_title || null,
      }));

      setPayRates(ratesWithEmployees);
    } catch (error: any) {
      console.error('Error fetching pay rates:', error);
      toast.error('Failed to load pay rates');
    } finally {
      setLoading(false);
    }
  }

  const filteredRates = payRates.filter(rate => {
    const matchesSearch = 
      rate.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.employee_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || rate.pay_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDelete = async (rateId: string) => {
    if (!confirm('Are you sure you want to delete this pay rate?')) return;

    try {
      const { error } = await supabase
        .from('pay_rates')
        .delete()
        .eq('id', rateId);

      if (error) throw error;

      toast.success('Pay rate deleted');
      fetchPayRates();
    } catch (error: any) {
      console.error('Error deleting pay rate:', error);
      toast.error('Failed to delete pay rate');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D13] text-white p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#EC4899]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D13] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/people/payroll">
              <Button variant="ghost" className="text-white/60 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Payroll
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Pay Rates</h1>
              <p className="text-white/60 text-sm">
                Manage employee compensation rates
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pay Rate
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1A1D26] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#EC4899]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-[#1A1D26] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
          >
            <option value="all">All Types</option>
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#1A1D26] rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0B0D13] border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Overtime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Effective From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-white/60">
                      {searchTerm || filterType !== 'all' 
                        ? 'No pay rates match your filters'
                        : 'No pay rates found. Add one to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-white">{rate.employee_name}</div>
                          <div className="text-sm text-white/60">{rate.position_title || 'No title'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 capitalize">
                          {rate.pay_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {rate.pay_type === 'salary' 
                          ? formatCurrency(rate.base_rate) + '/year'
                          : formatCurrency(rate.base_rate) + (rate.pay_type === 'hourly' ? '/hr' : '/day')
                        }
                      </td>
                      <td className="px-6 py-4 text-white/80">
                        {rate.overtime_multiplier ? `${rate.overtime_multiplier}x` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-white/80">
                        {formatDate(rate.effective_from)}
                      </td>
                      <td className="px-6 py-4">
                        {rate.is_current ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                            Current
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">
                            Historical
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRate(rate)}
                            className="text-white/60 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!rate.is_current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(rate.id)}
                              className="text-red-400/60 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
