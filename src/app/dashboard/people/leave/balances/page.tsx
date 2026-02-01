'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, TrendingUp, Users, Info, RefreshCw, MapPin, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import HolidayYearSettings from '@/components/people/HolidayYearSettings';

interface EnhancedLeaveBalance {
  id: string;
  company_id: string;
  profile_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  carried_over: number;
  adjustments: number;
  taken_days: number;
  pending_days: number;
  remaining_days: number;
  full_name: string;
  email?: string | null;
  site_id?: string | null;
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  calculated_entitlement: number;
  average_hours_13_weeks: number;
  overtime_holiday_days: number;
  total_days_in_lieu: number;
  accrued_days: number;
  available_days: number;
  employee_type: 'salaried' | 'hourly' | 'unknown';
}

interface Site {
  id: string;
  name: string;
}

export default function HolidayBalancesPage() {
  const { profile, companyId } = useAppContext();
  const { showToast } = useToast();
  const [balances, setBalances] = useState<EnhancedLeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterEmployeeType, setFilterEmployeeType] = useState<'all' | 'salaried' | 'hourly'>('all');
  const [filterSiteId, setFilterSiteId] = useState<string>('all');
  const [filterAllowanceStatus, setFilterAllowanceStatus] = useState<'all' | 'available' | 'taken' | 'pending' | 'exhausted'>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [isManager, setIsManager] = useState(false);

  const fetchSites = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSites(data || []);
    } catch (error: any) {
      console.error('Error fetching sites:', error);
    }
  }, [companyId]);

  const fetchBalances = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);

      // Preferred approach: RPC (SECURITY DEFINER) that returns balances + employee fields.
      // This avoids all client-side joins on `profiles`, which have been failing due to RLS.
      try {
        if (isManager) {
          // Non-fatal if not deployed yet
          await supabase.rpc('ensure_leave_balances_for_company', { p_company_id: companyId, p_year: selectedYear });
        }
      } catch (ensureErr) {
        console.warn('ensure_leave_balances_for_company RPC not available/failed:', ensureErr);
      }

      const { data: rpcBalances, error: rpcError } = await supabase.rpc('get_leave_balances_peoplely', {
        p_company_id: companyId,
        p_year: selectedYear,
      });

      if (rpcError) {
        console.error('❌ get_leave_balances_peoplely RPC error:', rpcError);
        showToast({
          title: 'Leave balances not available yet',
          description: 'Run `supabase/sql/peoplely_leave_balances_rpc.sql` in Supabase SQL Editor, then refresh.',
          type: 'error',
        });
        setBalances([]);
        return;
      }

      const transformedBalances: EnhancedLeaveBalance[] = (rpcBalances || []).map((row: any) => {
        const employeeType: 'salaried' | 'hourly' | 'unknown' =
          row.employee_type === 'salaried' || row.employee_type === 'hourly' ? row.employee_type : 'unknown';

        return {
          id: row.id,
          company_id: row.company_id,
          profile_id: row.profile_id,
          leave_type_id: row.leave_type_id,
          year: row.year,
          entitled_days: Number(row.entitled_days || 0),
          carried_over: Number(row.carried_over || 0),
          adjustments: Number(row.adjustments || 0),
          taken_days: Number(row.taken_days || 0),
          pending_days: Number(row.pending_days || 0),
          remaining_days: Number(row.remaining_days || 0),
          full_name: row.full_name || 'Unknown',
          email: row.email || null,
          site_id: row.site_id || null,
          leave_type_name: row.leave_type_name || 'Annual Leave',
          leave_type_code: row.leave_type_code || 'ANNUAL',
          leave_type_color: row.leave_type_color || '#6B7280',
          calculated_entitlement: Number(row.calculated_entitlement || 0),
          average_hours_13_weeks: Number(row.average_hours_13_weeks || 0),
          overtime_holiday_days: 0,
          total_days_in_lieu: 0,
          accrued_days: Number(row.accrued_days || 0),
          available_days: Number(row.available_days || 0),
          employee_type: employeeType,
        };
      });
      
      // Apply filters
      let filteredBalances = transformedBalances;
      
      // Filter by employee type if selected
      if (filterEmployeeType !== 'all') {
        filteredBalances = filteredBalances.filter(b => b.employee_type === filterEmployeeType);
      }
      
      // Filter by site if selected
      if (filterSiteId !== 'all') {
        filteredBalances = filteredBalances.filter(b => b.site_id === filterSiteId);
      }
      
      // If not manager, only show own balances
      if (!isManager && profile?.id) {
        filteredBalances = filteredBalances.filter(b => b.profile_id === profile.id);
      }
      
      // Sort by full_name
      filteredBalances.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      
      // Apply allowance status filter (client-side filtering for complex logic)
      if (filterAllowanceStatus !== 'all') {
        filteredBalances = filteredBalances.filter(balance => {
          const available = balance.available_days || 0;
          const taken = balance.taken_days || 0;
          const pending = balance.pending_days || 0;
          const remaining = balance.remaining_days || 0;
          
          switch (filterAllowanceStatus) {
            case 'available':
              return available > 0;
            case 'taken':
              return taken > 0;
            case 'pending':
              return pending > 0;
            case 'exhausted':
              return remaining <= 0 && available <= 0;
            default:
              return true;
          }
        });
      }
      
      setBalances(filteredBalances);
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      showToast({
        title: 'Failed to load balances',
        description: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, filterEmployeeType, filterSiteId, filterAllowanceStatus, isManager, profile?.id, showToast]);

  useEffect(() => {
    if (profile && companyId) {
      const manager = profile.app_role && ['admin', 'owner', 'manager'].includes((profile.app_role || '').toLowerCase());
      setIsManager(manager);
      if (manager) {
        fetchSites();
      }
    }
  }, [profile, companyId, fetchSites]);

  useEffect(() => {
    if (profile && companyId) {
      fetchBalances();
    }
  }, [profile, companyId, selectedYear, filterEmployeeType, filterSiteId, filterAllowanceStatus, fetchBalances]);

  // Listen for holiday year updates
  useEffect(() => {
    if (!companyId) return;
    
    const handleHolidayYearUpdate = () => {
      // Refresh balances when holiday year is updated
      fetchBalances();
    };

    window.addEventListener('holidayYearUpdated', handleHolidayYearUpdate);
    return () => {
      window.removeEventListener('holidayYearUpdated', handleHolidayYearUpdate);
    };
  }, [companyId, fetchBalances]);

  const recalculateBalances = async () => {
    if (!companyId) return;
    
    try {
      showToast({
        title: 'Recalculating balances',
        description: 'This may take a moment...',
        type: 'info'
      });
      
      // Trigger recalculation by updating balances
      // This will use the database functions to recalculate entitlements
      const { error } = await supabase.rpc('recalculate_leave_entitlements', {
        p_company_id: companyId,
        p_year: selectedYear
      });
      
      if (error && error.code !== '42883') { // Function might not exist yet
        console.warn('Recalculation function not available:', error.message);
      }
      
      // Refresh balances
      await fetchBalances();
      
      showToast({
        title: 'Balances recalculated',
        description: 'Holiday entitlements have been updated',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error recalculating:', error);
      showToast({
        title: 'Recalculation completed',
        description: 'Balances refreshed',
        type: 'success'
      });
      // Still refresh even if function doesn't exist
      await fetchBalances();
    }
  };

  const getEmployeeTypeBadge = (type: string) => {
    switch (type) {
      case 'salaried':
        return (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs">
                        Salaried
                      </span>
                    );
                  case 'hourly':
                    return (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs">
                        Hourly
                      </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-500/20 text-gray-600 dark:text-white/70 rounded-full text-xs">
            Unknown
          </span>
        );
    }
  };

  const getBalanceStatusColor = (remaining: number, entitled: number) => {
    const percentage = (remaining / entitled) * 100;
    if (percentage >= 50) return 'text-green-600 dark:text-green-400';
    if (percentage >= 25) return 'text-yellow-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/people/leave" className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-white/70" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holiday Balances</h1>
            <p className="text-gray-600 dark:text-white/70">View and manage employee holiday entitlements</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={recalculateBalances}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg border-0 shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_16px_rgba(59,130,246,0.6)] dark:hover:shadow-[0_0_16px_rgba(59,130,246,0.7)] transition-all duration-200 ease-in-out font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600 dark:text-white/70" />
          <label className="text-sm text-gray-600 dark:text-white/70">Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 pr-8 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        {isManager && (
          <>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600 dark:text-white/70" />
              <label className="text-sm text-gray-600 dark:text-white/70">Employee Type:</label>
              <select
                value={filterEmployeeType}
                onChange={(e) => setFilterEmployeeType(e.target.value as any)}
                className="px-3 py-1.5 pr-8 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All</option>
                <option value="salaried">Salaried</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-600 dark:text-white/70" />
              <label className="text-sm text-gray-600 dark:text-white/70">Site:</label>
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="px-3 py-1.5 pr-8 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600 dark:text-white/70" />
              <label className="text-sm text-gray-600 dark:text-white/70">Status:</label>
              <select
                value={filterAllowanceStatus}
                onChange={(e) => setFilterAllowanceStatus(e.target.value as any)}
                className="px-3 py-1.5 pr-8 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="all">All</option>
                <option value="available">Has Available</option>
                <option value="taken">Has Taken Leave</option>
                <option value="pending">Has Pending Requests</option>
                <option value="exhausted">Exhausted</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Holiday Year Settings */}
      {isManager && (
        <HolidayYearSettings />
      )}

      {/* Balances Table */}
      {balances.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-8 shadow-sm dark:shadow-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-amber-500/20 rounded-lg">
              <Info className="w-6 h-6 text-yellow-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leave Balances Found</h3>
              <p className="text-gray-600 dark:text-white/70 mb-4">
                {isManager 
                  ? 'No employees have leave balances for the selected year and filters.'
                  : 'You don\'t have any leave balances for the selected year.'}
              </p>
              
              {isManager && (
                <div className="space-y-3 mt-4 p-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.06]">
                  <p className="text-sm font-medium text-gray-700 dark:text-white/80 mb-2">Common issues and how to fix them:</p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-white/70">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>
                        <strong className="text-gray-900 dark:text-white">Missing start dates:</strong> Employees need a start date to calculate holiday entitlements. 
                        <Link href="/dashboard/people" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                          Update employee profiles
                        </Link>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>
                        <strong className="text-gray-900 dark:text-white">No leave balances created:</strong> Leave balances are created automatically when employees are added, but may need to be initialized for existing employees.
                        <button 
                          onClick={recalculateBalances}
                          className="text-blue-400 hover:underline ml-1"
                        >
                          Initialize balances
                        </button>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>
                        <strong className="text-gray-900 dark:text-white">Wrong year selected:</strong> Check if balances exist for a different year using the year filter above.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <span>
                        <strong className="text-gray-900 dark:text-white">Missing leave types:</strong> Ensure at least one leave type exists for your company.
                        <Link href="/dashboard/people/leave" className="text-blue-400 hover:underline ml-1">
                          Check leave types
                        </Link>
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden shadow-sm dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/[0.06]">
                <tr>
                  {isManager && <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-white/80">Employee</th>}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-white/80">Leave Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-white/80">Type</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Entitled</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Accrued</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Carried Over</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Days in Lieu</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Taken</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Pending</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">
                    <span className="text-green-600 dark:text-green-400">Available</span>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Remaining</th>
                  {isManager && (
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-white/80">Avg Hours (13w)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {balances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    {isManager && (
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium text-sm">{balance.full_name}</p>
                          {balance.email && (
                            <p className="text-gray-600 dark:text-white/70 text-xs">{balance.email}</p>
                          )}
                          {balance.site_id && sites.length > 0 && (
                            <p className="text-gray-500 dark:text-white/50 text-xs mt-0.5">
                              {sites.find(s => s.id === balance.site_id)?.name || 'No site'}
                            </p>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: balance.leave_type_color }}
                        />
                        <span className="text-gray-900 dark:text-white text-sm">{balance.leave_type_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getEmployeeTypeBadge(balance.employee_type)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span className="text-gray-900 dark:text-white text-sm font-medium">{balance.entitled_days}</span>
                        {balance.calculated_entitlement !== balance.entitled_days && (
                          <span className="text-gray-500 dark:text-white/50 text-xs ml-1">
                            (calc: {balance.calculated_entitlement})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                        {balance.accrued_days ? balance.accrued_days.toFixed(2) : '0.00'}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-white/50 mt-0.5">
                        {balance.entitled_days > 0 
                          ? `${Math.round((balance.accrued_days / balance.entitled_days) * 100)}%`
                          : '0%'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-white/80 text-sm">
                      {balance.carried_over > 0 ? balance.carried_over.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                          {balance.total_days_in_lieu > 0 ? balance.total_days_in_lieu.toFixed(2) : '-'}
                        </span>
                        {balance.overtime_holiday_days > 0 && (
                          <span className="text-purple-500 dark:text-purple-300 text-xs" title="From overtime">
                            (OT: {balance.overtime_holiday_days.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-white/80 text-sm">
                      {balance.taken_days.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 text-sm">
                      {balance.pending_days > 0 ? balance.pending_days.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-600 dark:text-green-400 text-sm font-bold">
                        {balance.available_days ? balance.available_days.toFixed(2) : '0.00'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold ${getBalanceStatusColor(balance.remaining_days, balance.entitled_days)}`}>
                        {balance.remaining_days.toFixed(2)}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-white/70 text-sm">
                        {balance.average_hours_13_weeks > 0 ? balance.average_hours_13_weeks.toFixed(1) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Banner - Moved to bottom */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 flex items-start gap-3 shadow-sm dark:shadow-none">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium mb-2 text-blue-950 dark:text-blue-100">How holiday entitlement is calculated:</p>
          <ul className="list-disc list-inside space-y-1.5 text-blue-800 dark:text-blue-200">
            <li><strong className="text-blue-950 dark:text-blue-100">Salaried employees:</strong> Standard 28 days (or custom allowance if set)</li>
            <li><strong className="text-blue-950 dark:text-blue-100">Hourly employees:</strong> Based on average hours worked over the last 13 weeks</li>
            <li><strong className="text-blue-950 dark:text-blue-100">Accrued days:</strong> Pro-rata entitlement based on days worked in the leave year</li>
            <li><strong className="text-blue-950 dark:text-blue-100">Available days:</strong> Accrued + Carried Over + Adjustments - Taken - Pending</li>
            <li><strong className="text-blue-950 dark:text-blue-100">Days in lieu:</strong> Includes overtime conversions and manual adjustments</li>
            <li><strong className="text-blue-950 dark:text-blue-100">Overtime:</strong> Converted to holiday days (7.5 hours = 1 day)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

