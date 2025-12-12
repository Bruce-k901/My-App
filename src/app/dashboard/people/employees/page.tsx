'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building2,
  ChevronDown,
  UserCheck,
  UserX,
  Clock,
  Download,
} from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  position_title: string | null;
  department: string | null;
  home_site: string | null;
  site_name?: string;
  status: string;
  employment_type: string;
  start_date: string | null;
  app_role: string;
  reports_to_name?: string;
}

export default function EmployeesPage() {
  const { profile } = useAppContext();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');

  useEffect(() => {
    if (profile?.company_id) {
      console.log('Fetching employees for company:', profile.company_id, 'status filter:', statusFilter);
      fetchEmployees();
    } else {
      console.warn('No company_id in profile:', profile);
    }
  }, [profile?.company_id, statusFilter]);

  const fetchEmployees = async () => {
    if (!profile?.company_id) {
      console.warn('No company_id in profile');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log('Starting employee fetch:', {
        companyId: profile.company_id,
        userId: profile.id,
        statusFilter,
        profileData: {
          id: profile.id,
          email: profile.email,
          app_role: profile.app_role
        }
      });

      // Use the SECURITY DEFINER function to bypass RLS recursion
      const { data, error } = await supabase.rpc('get_company_profiles', {
        p_company_id: profile.company_id
      });

      if (error) {
        // Log error details before SuppressConsoleWarnings can suppress it
        const errorDetails = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
          statusText: (error as any).statusText,
          fullError: error,
          errorString: String(error),
          errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
        };
        
        // Use console.log instead of console.error to avoid suppression
        console.log('❌ ERROR FETCHING EMPLOYEES (not suppressed):', errorDetails);
        
        // Also try to log via window.console directly
        if (typeof window !== 'undefined') {
          window.console.error('❌ Employee fetch error:', errorDetails);
        }
        
        // Try a simpler test query to check RLS
        console.log('Testing RLS with own profile...');
        const { data: testData, error: testError } = await supabase
          .from('profiles')
          .select('id, full_name, company_id')
          .eq('id', profile.id)
          .limit(1);
        
        console.log('RLS test query (own profile):', { 
          testData, 
          testError,
          testErrorDetails: testError ? {
            message: testError.message,
            code: testError.code,
            details: testError.details
          } : null
        });
        
        // Try querying without company_id filter
        console.log('Testing query without company_id filter...');
        const { data: allData, error: allError } = await supabase
          .from('profiles')
          .select('id, full_name, company_id')
          .limit(5);
        
        console.log('Query without filter:', { 
          allData, 
          allError,
          count: allData?.length 
        });
        
        setEmployees([]);
        return;
      }

      if (error) {
        // Log error details before SuppressConsoleWarnings can suppress it
        const errorDetails = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: (error as any).status,
          statusText: (error as any).statusText,
          fullError: error,
          errorString: String(error),
          errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
        };
        
        // Use console.log instead of console.error to avoid suppression
        console.log('❌ ERROR FETCHING EMPLOYEES (not suppressed):', errorDetails);
        
        // Also try to log via window.console directly
        if (typeof window !== 'undefined') {
          window.console.error('❌ Employee fetch error:', errorDetails);
        }
        
        setEmployees([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No employees found in database for company:', profile.company_id);
        setEmployees([]);
        return;
      }

      // Filter by status if needed (since RPC function returns all)
      let filteredData = data;
      if (statusFilter) {
        filteredData = data.filter((e: any) => e.status === statusFilter);
      }

      console.log('Employees fetched:', filteredData.length, 'of', data.length, 'total');

      // Get site names separately if needed
      const siteIds = filteredData.filter((e: any) => e.home_site).map((e: any) => e.home_site);
      let sitesMap = new Map();
      
      if (siteIds.length > 0) {
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds);
        
        sitesMap = new Map(sitesData?.map((s: any) => [s.id, s.name]) || []);
      }

      const formatted = filteredData.map((emp: any) => ({
        ...emp,
        id: emp.profile_id || emp.id, // Handle both return formats
        phone: emp.phone_number,
        employment_type: emp.contract_type || emp.employment_type || 'permanent', // Map contract_type to employment_type
        site_name: sitesMap.get(emp.home_site),
        reports_to_name: undefined,
      }));
      
      console.log('Formatted employees:', formatted.length, 'sample:', formatted[0]);
      setEmployees(formatted);
    } catch (err: any) {
      console.error('Unexpected error fetching employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const sites = [...new Set(employees.map(e => e.site_name).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.position_title?.toLowerCase().includes(search.toLowerCase());

    const matchesDept = !departmentFilter || emp.department === departmentFilter;
    const matchesSite = !siteFilter || emp.site_name === siteFilter;

    return matchesSearch && matchesDept && matchesSite;
  });

  const getInitials = (name: string) => 
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Active</span>;
      case 'onboarding':
        return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Onboarding</span>;
      case 'offboarding':
        return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">Offboarding</span>;
      case 'inactive':
        return <span className="px-2 py-0.5 bg-neutral-700 text-neutral-400 rounded text-xs">Inactive</span>;
      default:
        return <span className="px-2 py-0.5 bg-neutral-700 text-neutral-400 rounded text-xs">{status}</span>;
    }
  };

  const stats = {
    active: employees.filter(e => e.status === 'active').length,
    onboarding: employees.filter(e => e.status === 'onboarding').length,
    total: employees.length,
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
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-neutral-400">
            {stats.active} active employees{stats.onboarding > 0 && `, ${stats.onboarding} onboarding`}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700">
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link
            href="/dashboard/people/directory/new"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EC4899] to-blue-600 text-white rounded-lg hover:opacity-90"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="onboarding">Onboarding</option>
          <option value="offboarding">Offboarding</option>
          <option value="inactive">Inactive</option>
        </select>

        {departments.length > 0 && (
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept!}>{dept}</option>
            ))}
          </select>
        )}

        {sites.length > 0 && (
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          >
            <option value="">All Sites</option>
            {sites.map(site => (
              <option key={site} value={site!}>{site}</option>
            ))}
          </select>
        )}
      </div>

      {/* Results Count */}
      <p className="text-neutral-500 text-sm">
        Showing {filteredEmployees.length} of {employees.length} employees
      </p>

      {/* Employee Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Link
            key={employee.id}
            href={`/dashboard/people/directory/${employee.id}`}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white font-medium flex-shrink-0">
                {employee.avatar_url ? (
                  <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(employee.full_name)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate group-hover:text-[#EC4899] transition-colors">
                    {employee.full_name}
                  </p>
                  {getStatusBadge(employee.status)}
                </div>
                <p className="text-neutral-400 text-sm truncate">{employee.position_title || 'No title'}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-500">
                  {employee.department && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {employee.department}
                    </span>
                  )}
                  {employee.site_name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {employee.site_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
              <a
                href={`mailto:${employee.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 text-sm"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
              {employee.phone && (
                <a
                  href={`tel:${employee.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredEmployees.length === 0 && employees.length === 0 && !loading && (
        <div className="text-center py-12">
          <UserX className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400 mb-2">No employees found</p>
          <p className="text-neutral-500 text-sm">
            {profile?.company_id 
              ? 'Try adjusting your filters or add employees to your company.'
              : 'Unable to load company information.'}
          </p>
        </div>
      )}
      
      {filteredEmployees.length === 0 && employees.length > 0 && (
        <div className="text-center py-12">
          <UserX className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400">No employees found matching your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setDepartmentFilter('');
              setSiteFilter('');
            }}
            className="mt-4 px-4 py-2 text-sm text-[#EC4899] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

