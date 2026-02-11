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
  ArrowLeft,
  Loader2,
  X,
  AlertCircle,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import type { PayRate } from '@/types/teamly';

// Represents the effective rate to display - either from pay_rates table or profile fields
interface EffectiveRate {
  source: 'pay_rates' | 'profile'; // Where the data came from
  pay_rate_id: string | null;      // ID in pay_rates table (null if profile-only)
  pay_type: 'hourly' | 'salary' | 'daily';
  base_rate: number;               // In pence
  overtime_multiplier: number;
  contracted_hours_per_week: number;
  effective_from: string | null;
}

interface EmployeeWithRate {
  id: string;
  full_name: string;
  email: string;
  position_title: string | null;
  currentRate: EffectiveRate | null;
}

export default function PayRatesPage() {
  const { profile, companyId } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [employeesWithRates, setEmployeesWithRates] = useState<EmployeeWithRate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [formPayType, setFormPayType] = useState<'hourly' | 'salary' | 'daily'>('hourly');
  const [formBaseRate, setFormBaseRate] = useState('');
  const [formOvertimeMultiplier, setFormOvertimeMultiplier] = useState('1.5');
  const [formEffectiveFrom, setFormEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [formContractedHours, setFormContractedHours] = useState('40');

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  async function fetchData() {
    if (!companyId) return;

    setLoading(true);
    try {
      // 1. Fetch ALL employees including profile-level pay fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, position_title, pay_type, hourly_rate, annual_salary, contracted_hours')
        .eq('company_id', companyId)
        .not('app_role', 'is', null)
        .order('full_name');

      if (profilesError) throw profilesError;

      // 2. Fetch current pay rates from pay_rates table
      const { data: rates, error: ratesError } = await supabase
        .from('pay_rates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_current', true);

      if (ratesError && ratesError.code !== '42P01') throw ratesError;

      // 3. Build a map of pay_rates by profile_id
      const ratesMap = new Map<string, PayRate>();
      (rates || []).forEach((rate: PayRate) => {
        ratesMap.set(rate.profile_id, rate);
      });

      // 4. Merge: use pay_rates if available, otherwise fall back to profile fields
      const merged: EmployeeWithRate[] = (profiles || []).map((emp: any) => {
        const payRateRow = ratesMap.get(emp.id);

        let effectiveRate: EffectiveRate | null = null;

        if (payRateRow) {
          // pay_rates table is the primary source
          effectiveRate = {
            source: 'pay_rates',
            pay_rate_id: payRateRow.id,
            pay_type: payRateRow.pay_type,
            base_rate: payRateRow.base_rate,
            overtime_multiplier: payRateRow.overtime_multiplier,
            contracted_hours_per_week: payRateRow.contracted_hours_per_week,
            effective_from: payRateRow.effective_from,
          };
        } else if (emp.hourly_rate || emp.annual_salary) {
          // Fallback: profile has pay data but no pay_rates row
          const isSalaried = emp.pay_type === 'salaried' || emp.pay_type === 'salary';
          const rateInPounds = isSalaried ? emp.annual_salary : emp.hourly_rate;
          effectiveRate = {
            source: 'profile',
            pay_rate_id: null,
            pay_type: isSalaried ? 'salary' : 'hourly',
            base_rate: Math.round((rateInPounds || 0) * 100), // Convert £ to pence
            overtime_multiplier: 1.5,
            contracted_hours_per_week: emp.contracted_hours || 40,
            effective_from: null,
          };
        }

        return {
          id: emp.id,
          full_name: emp.full_name || 'Unknown',
          email: emp.email || '',
          position_title: emp.position_title || null,
          currentRate: effectiveRate,
        };
      });

      setEmployeesWithRates(merged);
    } catch (error: any) {
      console.error('Error fetching pay rates data:', error);
      toast.error('Failed to load pay rates');
    } finally {
      setLoading(false);
    }
  }

  const filtered = employeesWithRates.filter(emp => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'not_set') {
      return matchesSearch && !emp.currentRate;
    }
    if (filterType === 'all') {
      return matchesSearch;
    }
    return matchesSearch && emp.currentRate?.pay_type === filterType;
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

  const handleDelete = async (employee: EmployeeWithRate) => {
    if (!confirm('Are you sure you want to delete this pay rate?')) return;

    try {
      // Delete from pay_rates table if a row exists
      if (employee.currentRate?.pay_rate_id) {
        const { error } = await supabase
          .from('pay_rates')
          .delete()
          .eq('id', employee.currentRate.pay_rate_id);
        if (error) throw error;
      }

      // Clear the profile fields too
      await supabase
        .from('profiles')
        .update({
          pay_type: null,
          hourly_rate: null,
          annual_salary: null,
        })
        .eq('id', employee.id);

      toast.success('Pay rate deleted');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting pay rate:', error);
      toast.error('Failed to delete pay rate');
    }
  };

  function openModal(employee: EmployeeWithRate) {
    setEditingEmployee(employee);
    const rate = employee.currentRate;
    if (rate) {
      setFormPayType(rate.pay_type);
      setFormBaseRate((rate.base_rate / 100).toFixed(2));
      setFormOvertimeMultiplier(String(rate.overtime_multiplier || 1.5));
      setFormEffectiveFrom(rate.effective_from ? rate.effective_from.split('T')[0] : new Date().toISOString().split('T')[0]);
      setFormContractedHours(String(rate.contracted_hours_per_week || 40));
    } else {
      setFormPayType('hourly');
      setFormBaseRate('');
      setFormOvertimeMultiplier('1.5');
      setFormEffectiveFrom(new Date().toISOString().split('T')[0]);
      setFormContractedHours('40');
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingEmployee(null);
  }

  async function handleSaveRate() {
    if (!companyId || !editingEmployee || !formBaseRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const baseRateInPence = Math.round(parseFloat(formBaseRate) * 100);
      const rateInPounds = parseFloat(formBaseRate);
      const profileId = editingEmployee.id;
      const existingRate = editingEmployee.currentRate;

      if (existingRate?.pay_rate_id) {
        // Update existing row in pay_rates table
        const { error } = await supabase
          .from('pay_rates')
          .update({
            pay_type: formPayType,
            base_rate: baseRateInPence,
            overtime_multiplier: parseFloat(formOvertimeMultiplier) || 1.5,
            effective_from: formEffectiveFrom,
            contracted_hours_per_week: parseFloat(formContractedHours) || 40,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRate.pay_rate_id);

        if (error) throw error;
      } else {
        // Mark any existing current rate for this employee as not current
        await supabase
          .from('pay_rates')
          .update({ is_current: false, effective_to: formEffectiveFrom })
          .eq('company_id', companyId)
          .eq('profile_id', profileId)
          .eq('is_current', true);

        // Insert new rate
        const { error } = await supabase
          .from('pay_rates')
          .insert({
            company_id: companyId,
            profile_id: profileId,
            pay_type: formPayType,
            base_rate: baseRateInPence,
            currency: 'GBP',
            overtime_multiplier: parseFloat(formOvertimeMultiplier) || 1.5,
            weekend_multiplier: 1,
            bank_holiday_multiplier: 1,
            contracted_hours_per_week: parseFloat(formContractedHours) || 40,
            effective_from: formEffectiveFrom,
            is_current: true,
            created_by: profile?.id,
          });

        if (error) throw error;
      }

      // Sync to profiles table so payroll, rota costs, employee cards all reflect changes
      const profileUpdate: Record<string, any> = {
        pay_type: formPayType === 'salary' ? 'salaried' : 'hourly',
        contracted_hours: parseFloat(formContractedHours) || 40,
      };
      if (formPayType === 'hourly' || formPayType === 'daily') {
        profileUpdate.hourly_rate = rateInPounds;
        profileUpdate.annual_salary = null;
      } else {
        profileUpdate.annual_salary = rateInPounds;
        profileUpdate.hourly_rate = null;
      }

      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', profileId);

      toast.success(existingRate?.pay_rate_id ? 'Pay rate updated' : 'Pay rate added');
      closeModal();
      fetchData();
    } catch (error: any) {
      console.error('Error saving pay rate:', error);
      toast.error(error.message || 'Failed to save pay rate');
    } finally {
      setSaving(false);
    }
  }

  const noRateCount = employeesWithRates.filter(e => !e.currentRate).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B0D13] text-gray-900 dark:text-white p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pay Rates</h1>
              <p className="text-gray-500 dark:text-white/60 text-sm">
                Manage employee compensation rates
              </p>
            </div>
          </div>
        </div>

        {/* Warning banner if employees without rates */}
        {noRateCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>{noRateCount} employee{noRateCount !== 1 ? 's' : ''}</strong> {noRateCount !== 1 ? 'have' : 'has'} no pay rate set.
                These employees won&apos;t appear in payroll calculations until a rate is configured.
              </p>
              <button
                onClick={() => setFilterType('not_set')}
                className="ml-auto text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:underline whitespace-nowrap"
              >
                Show them
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1A1D26] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-[#1A1D26] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="all">All Employees</option>
            <option value="not_set">No Rate Set</option>
            <option value="hourly">Hourly</option>
            <option value="salary">Salary</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#1A1D26] rounded-lg border border-gray-300 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0B0D13] border-b border-gray-300 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Pay Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Overtime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Hours / Week
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Effective From
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-white/60">
                      {searchTerm || filterType !== 'all'
                        ? 'No employees match your filters'
                        : 'No employees found'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => {
                    const rate = emp.currentRate;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{emp.full_name}</div>
                            <div className="text-sm text-gray-500 dark:text-white/60">{emp.position_title || 'No title'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {rate ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 capitalize">
                              {rate.pay_type}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {rate ? (
                            rate.pay_type === 'salary'
                              ? formatCurrency(rate.base_rate) + '/year'
                              : formatCurrency(rate.base_rate) + (rate.pay_type === 'hourly' ? '/hr' : '/day')
                          ) : (
                            <span className="text-gray-400 dark:text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">
                          {rate?.overtime_multiplier ? `${rate.overtime_multiplier}x` : (
                            <span className="text-gray-400 dark:text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">
                          {rate?.contracted_hours_per_week ? `${rate.contracted_hours_per_week}h` : (
                            <span className="text-gray-400 dark:text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 dark:text-white/80">
                          {rate?.effective_from ? formatDate(rate.effective_from) : (
                            <span className="text-gray-400 dark:text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {rate ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openModal(emp)}
                                  className="text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(emp)}
                                  className="text-red-400/60 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => openModal(emp)}
                                className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-3 py-1"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Set Rate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-500 dark:text-white/40">
          Showing {filtered.length} of {employeesWithRates.length} employees
        </div>
      </div>

      {/* Edit/Add Pay Rate Modal */}
      {showModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1A1D26] rounded-xl border border-gray-300 dark:border-white/10 w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEmployee.currentRate ? 'Edit Pay Rate' : 'Set Pay Rate'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{editingEmployee.full_name}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Pay Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Pay Type *</label>
                <select
                  value={formPayType}
                  onChange={(e) => setFormPayType(e.target.value as 'hourly' | 'salary' | 'daily')}
                  className="w-full bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                >
                  <option value="hourly">Hourly</option>
                  <option value="salary">Annual Salary</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              {/* Base Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
                  {formPayType === 'hourly' ? 'Hourly Rate (£) *' : formPayType === 'salary' ? 'Annual Salary (£) *' : 'Daily Rate (£) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/40">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formBaseRate}
                    onChange={(e) => setFormBaseRate(e.target.value)}
                    placeholder={formPayType === 'salary' ? '25000.00' : '12.50'}
                    className="w-full pl-8 pr-4 py-2 bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Overtime Multiplier */}
              {formPayType === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Overtime Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={formOvertimeMultiplier}
                    onChange={(e) => setFormOvertimeMultiplier(e.target.value)}
                    className="w-full bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-white/40 mt-1">e.g. 1.5 = time and a half</p>
                </div>
              )}

              {/* Contracted Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Contracted Hours / Week</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formContractedHours}
                  onChange={(e) => setFormContractedHours(e.target.value)}
                  className="w-full bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>

              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Effective From *</label>
                <input
                  type="date"
                  value={formEffectiveFrom}
                  onChange={(e) => setFormEffectiveFrom(e.target.value)}
                  className="w-full bg-white dark:bg-[#0B0D13] border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-white/10">
              <Button
                variant="ghost"
                onClick={closeModal}
                className="text-gray-600 dark:text-white/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRate}
                disabled={saving || !formBaseRate}
                className="bg-blue-600 dark:bg-blue-500 text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {editingEmployee.currentRate ? 'Update Rate' : 'Set Rate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
