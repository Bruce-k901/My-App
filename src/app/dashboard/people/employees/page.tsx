'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building2,
  ChevronDown,
  UserX,
  Download,
  Pencil,
  User,
  Briefcase,
  Shield,
  CreditCard,
  Calendar,
  Loader2,
  ChevronUp,
  GraduationCap,
  AlertTriangle,
  Check,
  Layers,
} from '@/components/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import type { EmergencyContact } from '@/types/employee';
import type { EmployeeProfile, SiteOption, ManagerOption } from '@/types/employee';
import { InfoRow } from '@/components/people/InfoRow';
import { EditEmployeeModal } from '@/components/people/EditEmployeeModal';
import { buildProfileUpdateData, mapProfileToFormData, generateNextEmployeeNumber } from '@/lib/people/employee-save';
import EmployeeSiteAssignmentsModal from '@/components/people/EmployeeSiteAssignmentsModal';
import AddExecutiveModal from '@/components/users/AddExecutiveModal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { EmployeeTrainingEditor } from '@/components/people/EmployeeTrainingEditor';
import * as XLSX from 'xlsx';

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
  employee_number?: string | null;
  contracted_hours?: number | null;
  contracted_hours_per_week?: number | null;
  probation_end_date?: string | null;
  hourly_rate?: number | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const { profile, company, companyId } = useAppContext();
  const { isMobile } = useIsMobile();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedEmployeeData, setExpandedEmployeeData] = useState<Map<string, any>>(new Map());
  const [loadingExpandedData, setLoadingExpandedData] = useState<Set<string>>(new Set());
  const [showSiteAssignmentsModal, setShowSiteAssignmentsModal] = useState(false);
  const [siteAssignmentsEmployee, setSiteAssignmentsEmployee] = useState<Employee | null>(null);
  const [showExecutiveModal, setShowExecutiveModal] = useState(false);

  // Merge state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Check if user is staff (not admin/owner/manager)
  const userRole = profile?.app_role?.toLowerCase() || 'staff';
  const isStaff = !['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes(userRole);

  useEffect(() => {
    // If staff, redirect to their own profile page
    if (isStaff && profile?.id) {
      router.replace(`/dashboard/people/${profile.id}`);
      return;
    }

    if (companyId) {
      console.log('Fetching employees for company:', companyId, 'status filter:', statusFilter);
      fetchEmployees();
    } else {
      console.warn('No company_id in profile:', profile);
      
      // Run diagnostic to check profile status
      if (profile?.id) {
        supabase.rpc('diagnose_user_profile').then(({ data, error }) => {
          if (error) {
            console.error('Diagnostic error:', error);
          } else {
            console.log('ðŸ” Profile Diagnostic:', data);
            if (data && data.length > 0) {
              const diagnostic = data[0];
              if (!diagnostic.company_id) {
                console.error('âŒ Profile has no company_id!', {
                  profile_id: diagnostic.profile_id,
                  full_name: diagnostic.full_name,
                  email: diagnostic.email,
                  company_id: diagnostic.company_id
                });
                alert('Your profile is not linked to a company. Please contact an administrator.');
              }
            }
          }
        });
      }
    }
  }, [companyId, statusFilter]);

  const fetchEmployees = async () => {
    if (!companyId) {
      console.warn('No company_id in profile');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log('Starting employee fetch:', {
        companyId: companyId,
        userId: profile.id,
        statusFilter,
        profileData: {
          id: profile.id,
          email: profile.email,
          app_role: profile.app_role
        }
      });

      // Check if company_id exists before calling RPC
      if (!companyId) {
        console.warn('âš ï¸ Profile has no company_id - cannot fetch employees');
        console.log('Profile data:', { id: profile.id, email: profile.email, company_id: companyId });
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Use the SECURITY DEFINER function to bypass RLS recursion
      console.log('ðŸ” Calling get_company_profiles with company_id:', companyId);
      
      let rpcResult;
      try {
        rpcResult = await supabase.rpc('get_company_profiles', {
          p_company_id: companyId
        });
        
        // Log the raw response
        console.log('ðŸ” Raw RPC response:', JSON.stringify(rpcResult, null, 2));
      } catch (rpcError: any) {
        console.error('âŒ RPC call threw exception:', {
          message: rpcError?.message,
          stack: rpcError?.stack,
          name: rpcError?.name,
          code: rpcError?.code,
          details: rpcError?.details,
          hint: rpcError?.hint,
          fullError: JSON.stringify(rpcError, Object.getOwnPropertyNames(rpcError))
        });
        rpcResult = { data: null, error: rpcError };
      }
      
      const { data, error } = rpcResult || { data: null, error: null };
      
      console.log('ðŸ“Š RPC result:', {
        hasResult: !!rpcResult,
        hasData: !!data,
        data: data,
        dataLength: Array.isArray(data) ? data.length : 'not an array',
        dataType: typeof data,
        hasError: !!error,
        error: error,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
        fullResult: rpcResult
      });
      
      // Log sample data if available
      if (Array.isArray(data) && data.length > 0) {
        console.log('âœ… Sample employee from RPC:', data[0]);
        console.log('ðŸ” Sample employee home_site:', data[0].home_site);
        console.log('ðŸ” Sample employee keys:', Object.keys(data[0]));
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log('âš ï¸ Data is object, not array:', data);
      }

      if (error) {
        // Build comprehensive error details
        const errorDetails: any = {
          message: error?.message || 'Unknown error',
          details: error?.details || null,
          hint: error?.hint || null,
          code: error?.code || null,
          status: (error as any)?.status || null,
          statusText: (error as any)?.statusText || null,
        };
        
        // Try to extract more info
        try {
          errorDetails.errorString = String(error);
          errorDetails.errorKeys = Object.keys(error || {});
          errorDetails.errorJSON = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.serializationError = String(e);
        }
        
        // Use console.log and window.console to bypass suppression
        console.log('âŒâŒâŒ ERROR FETCHING EMPLOYEES (NOT SUPPRESSED):', errorDetails);
        
        if (typeof window !== 'undefined') {
          window.console.error('âŒâŒâŒ Employee fetch error (window.console):', errorDetails);
          window.console.error('Raw error object:', error);
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

      if (!data) {
        console.warn('âš ï¸ RPC returned null data');
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.error('âŒ RPC returned non-array data:', typeof data, data);
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      if (data.length === 0) {
        console.log('â„¹ï¸ No employees found in database for company:', companyId);
        console.log('This could mean:');
        console.log('  1. No other employees exist in your company');
        console.log('  2. All employees have different company_id');
        console.log('  3. RLS is blocking the function');
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Filter by status (RPC returns all statuses).
      // Default (no filter selected): hide inactive/archived employees.
      // Only show inactive when the user explicitly picks "Inactive".
      let filteredData = data;
      if (statusFilter) {
        filteredData = data.filter((e: any) => e.status === statusFilter);
      } else {
        filteredData = data.filter((e: any) => e.status !== 'inactive');
      }

      console.log('Employees fetched:', filteredData.length, 'of', data.length, 'total');

      // Get site names separately if needed
      const siteIds = filteredData
        .filter((e: any) => e.home_site)
        .map((e: any) => e.home_site)
        .filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
        .filter(Boolean); // Remove any null/undefined values
      
      console.log('ðŸ¢ Found site IDs from employees:', siteIds.length, siteIds);
      
      let sitesMap = new Map<string, string>();
      
      if (siteIds.length > 0) {
        console.log('ðŸ“¡ Fetching sites from Supabase...');
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds);
        
        if (sitesError) {
          console.error('âŒ Error fetching sites:', sitesError);
          console.error('Error details:', {
            message: sitesError.message,
            code: sitesError.code,
            details: sitesError.details,
            hint: sitesError.hint
          });
        } else {
          console.log('âœ… Fetched sites:', sitesData?.length || 0, sitesData);
          if (sitesData && sitesData.length > 0) {
            sitesMap = new Map(sitesData.map((s: any) => [String(s.id), s.name]));
            console.log('ðŸ—ºï¸ Sites map created with', sitesMap.size, 'entries:', Array.from(sitesMap.entries()));
          } else {
            console.warn('âš ï¸ Sites query returned empty array');
            console.log('ðŸ” Site IDs we searched for:', siteIds);
            // Try fetching all sites to see if RLS is blocking
            console.log('ðŸ” Testing RLS - fetching all sites for company:', companyId);
            const { data: allSites, error: allSitesError } = await supabase
              .from('sites')
              .select('id, name, company_id')
              .eq('company_id', companyId);
            console.log('ðŸ” All sites for company (RLS test):', allSites?.length || 0, allSitesError);
            if (allSitesError) {
              console.error('âŒ RLS test error:', allSitesError);
            } else if (allSites && allSites.length > 0) {
              console.log('âœ… Found sites via company_id filter:', allSites);
              // If we found sites via company_id but not via .in('id', siteIds), there might be a UUID mismatch
              // Try to match the siteIds with the found sites
              const matchedSites = allSites.filter((s: any) => siteIds.includes(String(s.id)));
              console.log('ðŸ” Matched sites:', matchedSites.length, matchedSites);
              if (matchedSites.length > 0) {
                // Use the matched sites to build the map
                sitesMap = new Map(matchedSites.map((s: any) => [String(s.id), s.name]));
                console.log('âœ… Rebuilt sites map from company filter:', sitesMap.size);
              }
            }
          }
        }
      } else {
        console.log('âš ï¸ No site IDs found in employee data');
        // Debug: Check if home_site exists in the data
        const sampleEmployee = filteredData[0];
        if (sampleEmployee) {
          console.log('ðŸ“‹ Sample employee keys:', Object.keys(sampleEmployee));
          console.log('ðŸ“‹ Sample employee home_site:', sampleEmployee.home_site, typeof sampleEmployee.home_site);
        }
      }

      const formatted = filteredData.map((emp: any, index: number) => {
        const homeSiteId = emp.home_site ? String(emp.home_site) : null;
        const siteName = homeSiteId ? sitesMap.get(homeSiteId) : null;
        
        // Debug for employees with home_site but no site_name
        if (homeSiteId && !siteName) {
          console.warn('âš ï¸ Employee has home_site but site_name not found:', {
            employee: emp.full_name || emp.id,
            home_site: homeSiteId,
            home_site_type: typeof homeSiteId,
            sitesMapSize: sitesMap.size,
            sitesMapKeys: Array.from(sitesMap.keys()),
            siteIdInMap: sitesMap.has(homeSiteId)
          });
        }
        
        // Debug: Log first few employees to see their data
        if (index < 3) {
          console.log(`ðŸ” Employee ${index} data:`, {
            name: emp.full_name,
            home_site: homeSiteId,
            site_name: siteName,
            hasHomeSite: !!homeSiteId,
            hasSiteName: !!siteName
          });
        }
        
        return {
          ...emp,
          id: emp.profile_id || emp.id, // Handle both return formats
          phone: emp.phone_number,
          employment_type: emp.contract_type || emp.employment_type || 'permanent', // Map contract_type to employment_type
          site_name: siteName,
          reports_to_name: undefined,
          // Ensure employee_number, start_date, contracted_hours_per_week, probation_end_date, and hourly_rate are preserved
          employee_number: emp.employee_number || null,
          start_date: emp.start_date || null,
          contracted_hours_per_week: emp.contracted_hours_per_week || null,
          contracted_hours: emp.contracted_hours_per_week || emp.contracted_hours || null, // Support both field names
          probation_end_date: emp.probation_end_date || null,
          hourly_rate: emp.hourly_rate ? emp.hourly_rate / 100 : null, // Convert from pence to pounds for display
        };
      });
      
      console.log('Formatted employees:', formatted.length);
      if (formatted.length > 0) {
        console.log('ðŸ“‹ Sample formatted employee:', {
          name: formatted[0].full_name,
          home_site: formatted[0].home_site,
          site_name: formatted[0].site_name,
          hasSiteName: !!formatted[0].site_name
        });
      }
      setEmployees(formatted);
      
      // Update expanded employee data if any employees are currently expanded
      // This ensures the expanded view shows the latest data after refresh
      if (expandedEmployees.size > 0) {
        formatted.forEach((emp: any) => {
          if (expandedEmployees.has(emp.id)) {
            // Trigger reload of full data for expanded employees
            loadExpandedEmployeeData(emp.id);
          }
        });
      }
    } catch (err: any) {
      console.error('Unexpected error fetching employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    if (!companyId) {
      console.warn('Cannot fetch sites: no company_id');
      return;
    }
    
    console.log('Fetching sites for company:', companyId);
    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name');
    
    if (error) {
      console.error('Error fetching sites:', error);
      setSites([]);
      return;
    }
    
    console.log('Fetched sites:', data?.length || 0, data);
    setSites(data || []);
  };

  const fetchManagers = async () => {
    if (!companyId) {
      console.warn('Cannot fetch managers: no company_id');
      return;
    }
    
    console.log('Fetching managers for company:', companyId);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', companyId)
      .in('app_role', ['Manager', 'Admin', 'Owner'])
      .order('full_name');
    
    if (error) {
      console.error('Error fetching managers:', error);
      setManagers([]);
      return;
    }
    
    console.log('Fetched managers:', data?.length || 0, data);
    setManagers(data || []);
  };

  useEffect(() => {
    if (companyId) {
      fetchSites();
      fetchManagers();
    }
  }, [companyId]);

  const handleEdit = async (employee: Employee) => {
    console.log('handleEdit called for:', employee.full_name, employee.id);

    // Load sites/managers in parallel with full profile fetch
    // Do NOT open the modal until we have full data (avoids race condition
    // where the async fetch overwrites user edits)
    const profilePromise = companyId
      ? supabase.from('profiles').select('*').eq('id', employee.id).single()
      : Promise.resolve({ data: null, error: null } as any);

    if (companyId) {
      await Promise.all([fetchSites(), fetchManagers(), profilePromise]);
    }

    // Build complete form data before opening the modal
    let formData: Record<string, any> = { ...employee };
    let contacts: any[] = [{ name: '', relationship: '', phone: '', email: '' }];

    try {
      const { data: profileData, error: profileError } = await profilePromise;

      if (!profileError && profileData) {
        const mappedData = mapProfileToFormData(profileData);
        formData = mappedData;

        if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
          contacts = profileData.emergency_contacts;
        }
      } else if (companyId) {
        // Fallback: use admin RPC (includes fewer fields but better than nothing)
        console.warn('select(*) failed, falling back to RPC:', profileError?.message);
        const { data: rpcData } = await supabase.rpc('get_company_profiles', {
          p_company_id: companyId,
        });
        if (rpcData && Array.isArray(rpcData)) {
          const fullData = rpcData.find((e: any) => (e.profile_id || e.id) === employee.id);
          if (fullData) {
            formData = {
              ...employee,
              ...fullData,
              id: fullData.profile_id || fullData.id,
              phone_number: fullData.phone_number || fullData.phone || '',
            };
          }
        }
      }
    } catch (err) {
      console.error('Exception fetching employee:', err);
    }

    // NOW open the modal — form data is already complete, no second overwrite
    setEditingEmployee(employee);
    setEditFormData(formData);
    setEmergencyContacts(contacts);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    
    setSaving(true);
    try {
      // Keep any emergency contact row that has at least one meaningful value.
      // (Previous logic required name+phone, which caused "next of kin not saving" in common cases.)
      const validEmergencyContacts = emergencyContacts
        .map((c) => ({
          name: (c.name || '').trim(),
          relationship: (c.relationship || '').trim(),
          phone: (c.phone || '').trim(),
          email: (c.email || '').trim(),
        }))
        .filter((c) => !!(c.name || c.relationship || c.phone || c.email));
      
      // Auto-generate employee number if empty
      let employeeNumber = editFormData.employee_number;
      if (!employeeNumber || employeeNumber.trim() === '') {
        const generated = await generateNextEmployeeNumber(supabase, companyId!, company?.name || '');
        if (generated) {
          employeeNumber = generated;
          setEditFormData({ ...editFormData, employee_number: generated });
        }
      }
      
      // Build update payload using shared utility
      const updateData = buildProfileUpdateData(editFormData, validEmergencyContacts, employeeNumber);

      // Log what we're about to save for debugging
      console.log('Saving employee data:', {
        employee_id: editingEmployee.id,
        updateData: {
          ...updateData,
          bank_account_number: updateData.bank_account_number ? '***' : null, // Don't log sensitive data
        }
      });

      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: editingEmployee.id, updateData }),
      });
      const resJson = await res.json();

      if (!res.ok || resJson.error) {
        console.error('Error updating employee:', resJson.error);
        console.error('Update data that failed:', updateData);
        alert(`Failed to update: ${resJson.error}`);
        return;
      }

      const data = resJson.data;
      console.log('Employee updated successfully:', data);

      // Optimistically update local list so the UI reflects changes immediately
      // even if the list RPC (`get_company_profiles`) doesn't return newer columns yet.
      setEmployees((prev) =>
        prev.map((emp: any) => {
          if (emp.id !== editingEmployee.id) return emp;
          return {
            ...emp,
            ...updateData,
            // Keep legacy/derived fields consistent
            phone: updateData.phone_number ?? emp.phone,
          };
        })
      );

      // Also update expanded cache immediately
      setExpandedEmployeeData((prev) => {
        const next = new Map(prev);
        const existing = next.get(editingEmployee.id) || {};
        next.set(editingEmployee.id, { ...existing, ...updateData, id: editingEmployee.id });
        return next;
      });

      await fetchEmployees();
      router.refresh(); // Refresh the router to update any open pages (like employee detail page)
      
      // Update expanded employee data if this employee is currently expanded
      if (expandedEmployees.has(editingEmployee.id)) {
        await loadExpandedEmployeeData(editingEmployee.id);
      }
      
      // Trigger a custom event to notify other pages of the update
      if (typeof window !== 'undefined') {
        console.log('ðŸ“¢ Dispatching employeeUpdated event for:', editingEmployee.id);
        window.dispatchEvent(new CustomEvent('employeeUpdated', { 
          detail: { employeeId: editingEmployee.id } 
        }));
        
        // Also use localStorage as a backup method
        localStorage.setItem(`employee_updated_${editingEmployee.id}`, Date.now().toString());
        // Trigger storage event manually (since it only fires in other tabs/windows)
        window.dispatchEvent(new StorageEvent('storage', {
          key: `employee_updated_${editingEmployee.id}`,
          newValue: Date.now().toString(),
          storageArea: localStorage
        }));
      }
      
      setEditingEmployee(null);
      setEditFormData({});
      setEmergencyContacts([]);
    } catch (err: any) {
      console.error('Exception updating employee:', err);
      alert(`Failed to update: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const loadExpandedEmployeeData = async (employeeId: string) => {
    if (loadingExpandedData.has(employeeId)) return; // Already loading
    
    setLoadingExpandedData(prev => new Set(prev).add(employeeId));
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (!profileError && profileData) {
        // Map profile data to display format
        const mappedData: any = {
          ...profileData,
          phone_number: profileData.phone_number || profileData.phone || '',
          contracted_hours: profileData.contracted_hours_per_week?.toString() || '',
          hourly_rate: profileData.hourly_rate ? (profileData.hourly_rate / 100).toString() : '', // Convert from pence
          salary: profileData.salary?.toString() || '',
          notice_period_weeks: profileData.notice_period_weeks?.toString() || '1',
          annual_leave_allowance: profileData.annual_leave_allowance?.toString() || '28',
        };
        
        setExpandedEmployeeData(prev => {
          const newMap = new Map(prev);
          newMap.set(employeeId, mappedData);
          return newMap;
        });
      }
    } catch (err) {
      console.error('Error loading expanded employee data:', err);
    } finally {
      setLoadingExpandedData(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    }
  };

  const handleToggleExpand = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
        // Load full employee data if not already loaded
        if (!expandedEmployeeData.has(employeeId)) {
          loadExpandedEmployeeData(employeeId);
        }
      }
      return newSet;
    });
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const siteNames = [...new Set(employees.map(e => e.site_name).filter(Boolean))];

  const handleExport = () => {
    try {
      const fields = [
        'full_name', 'email', 'phone', 'position_title', 'department',
        'site_name', 'status', 'app_role', 'start_date', 'employee_number',
        'contracted_hours_per_week',
      ];

      const rows = filteredEmployees.map((emp) => {
        const row: Record<string, any> = {};
        for (const f of fields) {
          row[f] = (emp as any)[f] ?? '';
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: fields });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      const xlsxArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([xlsxArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees_export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Export failed:', e?.message || 'Unable to export');
      alert(`Export failed: ${e?.message || 'Unable to export'}`);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.position_title?.toLowerCase().includes(search.toLowerCase());

    const matchesDept = !departmentFilter || emp.department === departmentFilter;
    const matchesSite = !siteFilter || emp.site_name === siteFilter;

    return matchesSearch && matchesDept && matchesSite;
  });

  // Merge helpers
  const canMerge = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager'].includes(userRole);

  const selectedEmployees = employees.filter(e => selectedForMerge.has(e.id));

  function toggleMergeSelection(id: string) {
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openMergeDialog() {
    if (selectedForMerge.size < 2) return;
    const firstSelected = Array.from(selectedForMerge)[0];
    setCanonicalId(firstSelected);
    setIsMergeOpen(true);
  }

  async function handleMerge() {
    if (!canonicalId || !companyId) return;
    const mergeIds = Array.from(selectedForMerge).filter(id => id !== canonicalId);
    if (mergeIds.length === 0) return;

    setMerging(true);
    try {
      const res = await fetch('/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalProfileId: canonicalId, mergeProfileIds: mergeIds, companyId }),
      });
      const result = await res.json();
      if (result.success) {
        setEmployees(prev => prev.filter(e => !mergeIds.includes(e.id)));
        const d = result.details;
        const parts = [];
        if (d?.deactivated) parts.push(`${d.deactivated} profile(s) deactivated`);
        if (d?.repointed) parts.push(`${d.repointed} record(s) transferred`);
        if (d?.errors) parts.push(`${d.errors} table(s) skipped`);
        alert(`Merge complete. ${parts.join(', ') || 'No child records to transfer.'}`);
        setIsMergeOpen(false);
        setMergeMode(false);
        setSelectedForMerge(new Set());
        setCanonicalId(null);
        fetchEmployees();
      } else {
        alert(result.error || 'Merge failed');
      }
    } catch (err: any) {
      alert(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 bg-green-600/15 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">Active</span>;
      case 'onboarding':
        return <span className="px-2 py-0.5 bg-blue-600/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">Onboarding</span>;
      case 'offboarding':
        return <span className="px-2 py-0.5 bg-amber-600/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded text-xs font-medium">Offboarding</span>;
      case 'inactive':
        return <span className="px-2 py-0.5 bg-theme-button text-theme-secondary rounded text-xs font-medium">Inactive</span>;
      default:
        return <span className="px-2 py-0.5 bg-theme-button text-theme-secondary rounded text-xs font-medium">{status}</span>;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Simplified on mobile */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
 <h1 className="text-2xl font-bold text-theme-primary">
            {isMobile ? 'Staff Directory' : 'Employees'}
          </h1>
 <p className="text-theme-secondary dark:text-theme-tertiary">
            {stats.active} active{!isMobile && stats.onboarding > 0 && `, ${stats.onboarding} onboarding`}
          </p>
        </div>
        {/* Hide action buttons on mobile */}
        {!isMobile && (
          <div className="flex gap-3">
            {canMerge && mergeMode ? (
              <>
                <button
                  onClick={openMergeDialog}
                  disabled={selectedForMerge.size < 2}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  <span>Merge ({selectedForMerge.size})</span>
                </button>
                <button
                  onClick={() => { setMergeMode(false); setSelectedForMerge(new Set()); }}
                  className="flex items-center gap-2 px-4 py-2 border border-theme text-theme-secondary hover:text-theme-primary rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {canMerge && (
                  <button
                    onClick={() => setMergeMode(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:text-theme-primary border border-theme rounded-lg hover:bg-theme-surface transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    Merge Employees
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated text-theme-primary rounded-lg hover:bg-theme-button-hover transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>

                {/* Add Head Office / Executive Button */}
                <button
                  onClick={() => setShowExecutiveModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow rounded-lg font-medium transition-all duration-200 ease-in-out"
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Head Office</span>
                  <span className="sm:hidden">Head Office</span>
                </button>

                {/* Add Site Employee Button */}
                <Link
                  href="/dashboard/people/directory/new"
                  className="flex items-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow rounded-lg font-medium transition-all duration-200 ease-in-out"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Site Employee</span>
                  <span className="sm:hidden">Site Employee</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filters - Search only on mobile */}
      <div className="flex flex-wrap gap-4">
        <div className={`relative ${isMobile ? 'w-full' : 'flex-1 max-w-md'}`}>
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary dark:text-theme-tertiary"/>
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-10 pr-4 py-3 bg-theme-surface-elevated border border-theme rounded-xl text-theme-primary placeholder-theme-tertiary dark:placeholder-gray-500 focus:border-module-fg focus:ring-1 focus:ring-module-fg"
          />
        </div>

        {/* Hide extra filters on mobile */}
        {!isMobile && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-4 pr-10 py-2 bg-theme-button border border-theme rounded-lg text-theme-primary"
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
                className="pl-4 pr-10 py-2 bg-theme-button border border-theme rounded-lg text-theme-primary"
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
                className="pl-4 pr-10 py-2 bg-theme-button border border-theme rounded-lg text-theme-primary"
              >
                <option value="">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.name}>{site.name}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {/* Results Count */}
 <p className="text-theme-tertiary dark:text-theme-tertiary text-sm">
        Showing {filteredEmployees.length} of {employees.length} employees
      </p>

      {/* Employee Grid - Single column on mobile */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4 transition-all ${editingEmployee ? 'opacity-30 pointer-events-none' : ''}`}>
        {filteredEmployees.map((employee) => {
          const isExpanded = expandedEmployees.has(employee.id);
          const fullData = expandedEmployeeData.get(employee.id);
          const isLoadingData = loadingExpandedData.has(employee.id);
          const isMergeSelected = selectedForMerge.has(employee.id);

          return (
            <div
              key={employee.id}
              onClick={mergeMode ? () => toggleMergeSelection(employee.id) : undefined}
              className={`bg-theme-button border rounded-xl p-4 transition-colors group relative ${
                mergeMode
                  ? `cursor-pointer ${isMergeSelected ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-theme hover:bg-theme-hover'}`
                  : `border-theme hover:border-module-fg/50 ${isExpanded && !isMobile ? 'md:col-span-2 lg:col-span-3' : ''}`
              }`}
            >
              {/* Merge checkbox */}
              {mergeMode && (
                <div className={`absolute top-4 left-4 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors z-10 ${
                  isMergeSelected ? 'bg-amber-500 border-amber-500' : 'border-theme'
                }`}>
                  {isMergeSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              )}

              {/* Edit Button and Expand Button - Positioned absolutely */}
              {!editingEmployee && !mergeMode && (
                <div
                  className="absolute top-2 right-2 z-10 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const employeeToEdit = expandedEmployeeData.get(employee.id) || employee;
                      handleEdit(employeeToEdit);
                    }}
                    className="p-1.5 bg-theme-surface-elevated hover:bg-theme-button-hover rounded-lg text-theme-primary hover:text-module-fg transition-all cursor-pointer active:scale-95 shadow-lg hover:shadow-module-glow"
                    title="Edit Employee"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleToggleExpand(employee.id);
                    }}
                    className="p-1.5 bg-theme-surface-elevated hover:bg-theme-button-hover rounded-lg text-theme-primary hover:text-module-fg transition-all cursor-pointer active:scale-95"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
              
              {/* Card Header - Clickable to navigate or toggle expand */}
              <div
                onClick={mergeMode ? undefined : (e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('.absolute.top-2.right-2')) {
                    return;
                  }
                  if (isExpanded) {
                    handleToggleExpand(employee.id);
                  } else {
                    router.push(`/dashboard/people/${employee.id}`);
                  }
                }}
                className={`${mergeMode ? 'pl-8' : 'cursor-pointer'} ${isExpanded ? 'pr-20' : 'pr-20'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-module-fg flex items-center justify-center text-white font-medium flex-shrink-0">
                    {employee.avatar_url ? (
                      <img src={employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(employee.full_name)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-theme-primary font-medium truncate group-hover:text-module-fg transition-colors">
                        {employee.full_name}
                      </p>
                      {getStatusBadge(employee.status)}
                      {employee.status === 'onboarding' && (
                        <Link
                          href={`/dashboard/people/onboarding?employeeId=${employee.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0.5 bg-module-fg/15 text-module-fg rounded text-xs hover:bg-module-fg/25"
                          title="Go to onboarding"
                        >
                          Go to onboarding
                        </Link>
                      )}
                    </div>
                    <p className="text-theme-secondary text-sm truncate">{employee.position_title || 'No title'}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-theme-tertiary">
                      {employee.department && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {employee.department}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {employee.site_name || 'No home site set'}
                      </span>
                    </div>
                  </div>
                </div>

                {!isExpanded && !mergeMode && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-theme">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (!employee.home_site) {
                          alert('Please set the employee\'s home site before adding them to the rota. You can edit the employee details to set the home site.');
                          return;
                        }
                        // Pass both site and employee ID so the schedule page can highlight the employee
                        const params = new URLSearchParams();
                        params.set('site', employee.home_site);
                        params.set('employee', employee.id);
                        router.push(`/dashboard/people/schedule?${params.toString()}`);
                      }}
                      disabled={!employee.home_site}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all border ${
                        employee.home_site
                          ? 'bg-module-fg/15 hover:bg-module-fg/25 text-module-fg border-module-fg/30'
                          : 'bg-theme-button text-theme-tertiary border-theme cursor-not-allowed'
                      }`}
                      title={!employee.home_site ? 'Please set home site first' : 'Add to Rota'}
                    >
                      <Calendar className="w-4 h-4" />
                      Add to Rota
                    </button>
                    <a
                      href={`mailto:${employee.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated text-theme-secondary rounded-lg hover:bg-theme-button-hover text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                    {employee.phone && (
                      <a
                        href={`tel:${employee.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated text-theme-secondary rounded-lg hover:bg-theme-button-hover text-sm"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!employee.email) {
                          alert('No email address for this employee.');
                          return;
                        }
                        if (!confirm(`Send login invite to ${employee.email}?`)) return;
                        try {
                          const res = await fetch('/api/users/resend-invite', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: employee.email, userId: employee.id }),
                          });
                          const json = await res.json();
                          if (!res.ok) {
                            alert(`Failed to send invite: ${json.error || 'Unknown error'}`);
                            return;
                          }
                          alert(`Invitation sent to ${employee.email}`);
                        } catch (err: any) {
                          console.error('Error sending invite:', err);
                          alert(`Failed to send invite: ${err?.message || 'Unknown error'}`);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-theme-surface-elevated dark:bg-theme-surface-elevated text-[#D37E91] rounded-lg hover:bg-[#D37E91]/10 text-sm transition-all"
                      title="Send Login Invite"
                    >
                      <Mail className="w-4 h-4" />
                      Invite
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded View */}
              {isExpanded && !mergeMode && (
                <div className="mt-4 pt-4 border-t border-theme" onClick={(e) => e.stopPropagation()}>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-module-fg" />
                      <span className="ml-2 text-theme-secondary">Loading details...</span>
                    </div>
                  ) : fullData ? (
                    <ExpandedEmployeeView
                      employee={fullData || employee}
                      sites={sites}
                      managers={managers}
                      onEdit={() => {
                        // Use the same handleEdit function - it will handle loading sites/managers if needed
                        // Use fullData if available (expanded data), otherwise fall back to employee
                        const employeeToEdit = fullData || employee;
                        handleEdit(employeeToEdit);
                      }}
                      onOpenSiteAssignments={(emp) => {
                        setSiteAssignmentsEmployee(emp);
                        setShowSiteAssignmentsModal(true);
                      }}
                      onUpdate={async () => {
                        // Reload expanded employee data + main list (for status/site changes)
                        await Promise.all([
                          loadExpandedEmployeeData(employee.id),
                          fetchEmployees(),
                        ]);
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-theme-secondary">
                      Failed to load employee details
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && employees.length === 0 && !loading && (
        <div className="text-center py-12">
          <UserX className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-secondary mb-2">No employees found</p>
          <p className="text-theme-tertiary text-sm">
            {companyId 
              ? 'Try adjusting your filters or add employees to your company.'
              : 'Unable to load company information.'}
          </p>
        </div>
      )}
      
      {filteredEmployees.length === 0 && employees.length > 0 && (
        <div className="text-center py-12">
          <UserX className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-secondary">No employees found matching your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setDepartmentFilter('');
              setSiteFilter('');
            }}
            className="mt-4 px-4 py-2 text-sm text-module-fg hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee as unknown as EmployeeProfile}
          formData={editFormData}
          setFormData={setEditFormData}
          emergencyContacts={emergencyContacts}
          setEmergencyContacts={setEmergencyContacts}
          sites={sites}
          managers={managers}
          onClose={() => {
            setEditingEmployee(null);
            setEditFormData({});
            setEmergencyContacts([]);
          }}
          onSave={handleSaveEdit}
          saving={saving}
          onOpenSiteAssignments={(emp) => {
            setSiteAssignmentsEmployee(emp as unknown as Employee);
            setShowSiteAssignmentsModal(true);
          }}
        />
      )}

      {/* Site Assignments Modal */}
      {showSiteAssignmentsModal && siteAssignmentsEmployee && company && (
        <EmployeeSiteAssignmentsModal
          isOpen={showSiteAssignmentsModal}
          onClose={() => {
            setShowSiteAssignmentsModal(false);
            setSiteAssignmentsEmployee(null);
          }}
          employeeId={siteAssignmentsEmployee.id}
          employeeName={siteAssignmentsEmployee.full_name}
          homeSiteId={siteAssignmentsEmployee.home_site}
          companyId={companyId!}
        />
      )}

      {/* Add Executive / Head Office Modal */}
      {companyId && (
        <AddExecutiveModal
          open={showExecutiveModal}
          onClose={() => setShowExecutiveModal(false)}
          companyId={companyId}
          onRefresh={fetchEmployees}
        />
      )}

      {/* Merge Employees Modal */}
      <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-theme-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Merge Employees
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-3">
            <p className="text-sm text-theme-secondary">
              Select the employee to keep. All other selected employees will be merged into them and deactivated.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedEmployees.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setCanonicalId(emp.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    canonicalId === emp.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-600/10'
                      : 'border-theme hover:bg-theme-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-theme-primary font-medium">{emp.full_name}</span>
                      {emp.position_title && (
                        <span className="text-theme-tertiary text-xs ml-2">({emp.position_title})</span>
                      )}
                    </div>
                    {canonicalId === emp.id && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-600/20 px-2 py-0.5 rounded">
                        Keep
                      </span>
                    )}
                  </div>
                  {emp.site_name && (
                    <p className="text-xs text-theme-tertiary mt-0.5">{emp.site_name}</p>
                  )}
                  {canonicalId !== emp.id && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Will be merged &amp; deactivated</p>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-600/30 rounded-lg p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                All attendance, training, leave, shifts, and other records will be transferred to the kept employee. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleMerge}
                disabled={merging || !canonicalId}
                variant="secondary"
                className="flex-1"
              >
                {merging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Merging...
                  </>
                ) : (
                  'Confirm Merge'
                )}
              </Button>
              <Button onClick={() => setIsMergeOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Expanded Employee View Component
function ExpandedEmployeeView({
  employee,
  sites,
  managers,
  onEdit,
  onUpdate,
  onOpenSiteAssignments,
}: {
  employee: any;
  sites: { id: string; name: string }[];
  managers: { id: string; full_name: string }[];
  onEdit: () => void;
  onUpdate: () => void;
  onOpenSiteAssignments: (employee: any) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'compliance' | 'banking' | 'leave' | 'pay' | 'training'>('personal');
  const [archiving, setArchiving] = useState(false);

  const handleArchiveToggle = async () => {
    const isCurrentlyActive = employee.status !== 'inactive';
    const action = isCurrentlyActive ? 'archive' : 'restore';
    if (!confirm(`Are you sure you want to ${action} ${employee.full_name}?`)) return;

    setArchiving(true);
    try {
      const res = await fetch('/api/people/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          updateData: { status: isCurrentlyActive ? 'inactive' : 'active' },
        }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      onUpdate();
    } catch (err) {
      console.error('Archive toggle failed:', err);
      alert(`Failed to ${action} employee. Please try again.`);
    } finally {
      setArchiving(false);
    }
  };

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return '\u2014';
    return sites.find(s => s.id === siteId)?.name || siteId;
  };

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return '\u2014';
    return managers.find(m => m.id === managerId)?.full_name || managerId;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number | string | null, isPence: boolean = false) => {
    if (!value && value !== 0) return '\u2014';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '\u2014';
    // If isPence is true (like hourly_rate), convert to pounds
    // Otherwise assume the value is already in pounds
    const displayValue = isPence ? num / 100 : num;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(displayValue);
  };

  const emergencyContacts = Array.isArray(employee.emergency_contacts) 
    ? employee.emergency_contacts 
    : (employee.emergency_contacts ? [employee.emergency_contacts] : []);

  return (
    <div className="space-y-4">
      {/* Header with Edit button and Add to Rota */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">Employee Details</h3>
          <p className="text-theme-secondary text-sm mt-1">{employee.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!employee.home_site) {
                alert('Please set the employee\'s home site before adding them to the rota. Use the edit button to set the home site.');
                return;
              }
              // Navigate to schedule page with the employee's home site and employee ID
              const params = new URLSearchParams();
              params.set('site', employee.home_site);
              params.set('employee', employee.id);
              router.push(`/dashboard/people/schedule?${params.toString()}`);
            }}
            disabled={!employee.home_site}
            className={`px-3 py-1.5 bg-transparent border rounded-lg text-sm transition-all flex items-center gap-1 ${
              employee.home_site
                ? 'border-module-fg text-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow'
                : 'border-theme text-theme-tertiary cursor-not-allowed opacity-50'
            }`}
            title={!employee.home_site ? 'Please set home site first' : 'Add to Rota'}
          >
            <Calendar className="w-4 h-4" />
            Add to Rota
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow rounded-lg text-sm transition-all"
          >
            <Pencil className="w-4 h-4 inline mr-1" />
            Edit
          </button>
          <button
            onClick={handleArchiveToggle}
            disabled={archiving}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1 border ${
              employee.status === 'inactive'
                ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                : 'border-red-400 text-red-400 hover:bg-red-400/10'
            } disabled:opacity-50`}
            title={employee.status === 'inactive' ? 'Restore employee' : 'Archive employee'}
          >
            {archiving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
            {employee.status === 'inactive' ? 'Restore' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Tabs - Matching Edit Modal */}
      <div className="flex gap-2 border-b border-theme overflow-x-auto">
        {[
          { id: 'personal', label: 'Personal', icon: User },
          { id: 'employment', label: 'Employment', icon: Briefcase },
          { id: 'compliance', label: 'Compliance', icon: Shield },
          { id: 'banking', label: 'Banking', icon: CreditCard },
          { id: 'leave', label: 'Leave', icon: Calendar },
          { id: 'pay', label: 'Pay & Tax', icon: CreditCard },
          { id: 'training', label: 'Training', icon: GraduationCap },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-theme-surface-elevated dark:bg-theme-surface-elevated text-theme-primary border-b-2 border-module-fg'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-button-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="border border-theme rounded-lg bg-theme-button">
        {activeTab === 'personal' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-module-fg" />
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={employee.full_name || '\u2014'} fieldName="full_name" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Email" value={employee.email || '\u2014'} fieldName="email" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Phone Number" value={employee.phone_number || employee.phone || '\u2014'} fieldName="phone_number" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Date of Birth" value={formatDate(employee.date_of_birth) || '\u2014'} fieldName="date_of_birth" employeeId={employee.id} onUpdate={onUpdate} type="date" />
              <InfoRow label="Gender" value={employee.gender || '\u2014'} fieldName="gender" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'non_binary', label: 'Non-binary' },
                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                { value: 'other', label: 'Other' }
              ]} />
              <InfoRow label="Nationality" value={employee.nationality || '\u2014'} fieldName="nationality" employeeId={employee.id} onUpdate={onUpdate} />
            </div>
            
            {/* Address */}
            <div className="border-t border-theme pt-4 mt-4">
              <h5 className="text-sm font-medium text-theme-primary mb-3">Address</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <InfoRow label="Address Line 1" value={employee.address_line_1 || '\u2014'} fieldName="address_line_1" employeeId={employee.id} onUpdate={onUpdate} />
                </div>
                <div className="md:col-span-2">
                  <InfoRow label="Address Line 2" value={employee.address_line_2 || '\u2014'} fieldName="address_line_2" employeeId={employee.id} onUpdate={onUpdate} />
                </div>
                <InfoRow label="City" value={employee.city || '\u2014'} fieldName="city" employeeId={employee.id} onUpdate={onUpdate} />
                <InfoRow label="County" value={employee.county || '\u2014'} fieldName="county" employeeId={employee.id} onUpdate={onUpdate} />
                <InfoRow label="Postcode" value={employee.postcode || '\u2014'} fieldName="postcode" employeeId={employee.id} onUpdate={onUpdate} />
                <InfoRow label="Country" value={employee.country || 'United Kingdom'} fieldName="country" employeeId={employee.id} onUpdate={onUpdate} />
              </div>
            </div>

            {/* Emergency Contacts */}
            {emergencyContacts.length > 0 && (
              <div className="border-t border-theme pt-4 mt-4">
                <h5 className="text-sm font-medium text-theme-primary mb-3">Emergency Contacts</h5>
                <div className="space-y-3">
                  {emergencyContacts.map((contact: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white/[0.03] rounded">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <InfoRow label="Name" value={contact.name || '\u2014'} />
                        <InfoRow label="Relationship" value={contact.relationship || '\u2014'} />
                        <InfoRow label="Phone" value={contact.phone || '\u2014'} />
                        <InfoRow label="Email" value={contact.email || '\u2014'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'employment' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-module-fg" />
              Employment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Employee Number" value={employee.employee_number || '\u2014'} fieldName="employee_number" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Position / Job Title" value={employee.position_title || '\u2014'} fieldName="position_title" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Department" value={employee.department || '\u2014'} fieldName="department" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="App Role" value={employee.app_role || 'Staff'} fieldName="app_role" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'staff', label: 'Staff' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' }
              ]} />
              <InfoRow
                label="Home Site"
                value={employee.home_site ? getSiteName(employee.home_site) : 'Not set'}
                fieldName="home_site"
                employeeId={employee.id}
                onUpdate={onUpdate}
                type="select"
                options={[{ value: '', label: 'Not set' }, ...sites.map(s => ({ value: s.id, label: s.name }))]}
                actualValue={employee.home_site || ''}
              />
              {onOpenSiteAssignments && (
                <div className="md:col-span-2 pt-4 border-t border-white/[0.1]">
                  <div className="bg-module-fg/10 border border-module-fg/30 rounded-lg p-3 mb-3">
                    <p className="text-xs text-module-fg mb-2">
                      <strong>Multi-Site Assignment:</strong> Allow this employee to work at other sites
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('Opening site assignments modal for:', employee);
                      if (onOpenSiteAssignments) {
                        onOpenSiteAssignments(employee);
                      } else {
                        console.error('onOpenSiteAssignments is not defined');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-module-fg text-module-fg hover:bg-module-fg/10 hover:shadow-module-glow rounded-lg transition-all font-medium"
                  >
                    <MapPin className="w-5 h-5" />
                    Manage Site Assignments
                  </button>
                  <p className="text-xs text-theme-tertiary mt-2 text-center">
                    Allow this employee to work at other sites during specified date ranges
                  </p>
                </div>
              )}
              <InfoRow 
                label="Reports To" 
                value={employee.reports_to ? getManagerName(employee.reports_to) : 'Not set'} 
                fieldName="reports_to" 
                employeeId={employee.id} 
                onUpdate={onUpdate} 
                type="select" 
                options={[{ value: '', label: 'Not set' }, ...managers.map(m => ({ value: m.id, label: m.full_name }))]}
                actualValue={employee.reports_to || ''}
              />
              <InfoRow label="BOH / FOH" value={employee.boh_foh || 'FOH'} fieldName="boh_foh" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'FOH', label: 'FOH' },
                { value: 'BOH', label: 'BOH' },
                { value: 'BOTH', label: 'Both' }
              ]} />
              <InfoRow label="Start Date" value={formatDate(employee.start_date) || '\u2014'} fieldName="start_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
              <InfoRow label="Probation End Date" value={formatDate(employee.probation_end_date) || '\u2014'} fieldName="probation_end_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
              <InfoRow label="Contract Type" value={employee.contract_type || 'permanent'} fieldName="contract_type" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'permanent', label: 'Permanent' },
                { value: 'fixed_term', label: 'Fixed Term' },
                { value: 'zero_hours', label: 'Zero Hours' },
                { value: 'casual', label: 'Casual' },
                { value: 'agency', label: 'Agency' },
                { value: 'contractor', label: 'Contractor' },
                { value: 'apprentice', label: 'Apprentice' }
              ]} />
              <InfoRow label="Contracted Hours (per week)" value={employee.contracted_hours?.toString() || employee.contracted_hours_per_week?.toString() || '\u2014'} fieldName="contracted_hours_per_week" employeeId={employee.id} onUpdate={onUpdate} type="number" />
              <InfoRow label="Hourly Rate" value={employee.hourly_rate ? formatCurrency(typeof employee.hourly_rate === 'string' ? parseFloat(employee.hourly_rate) : employee.hourly_rate, true) : '\u2014'} fieldName="hourly_rate" employeeId={employee.id} onUpdate={onUpdate} type="number" />
              <InfoRow label="Annual Salary" value={formatCurrency(employee.salary) || '\u2014'} fieldName="salary" employeeId={employee.id} onUpdate={onUpdate} type="number" />
              <InfoRow label="Pay Frequency" value={employee.pay_frequency || 'monthly'} fieldName="pay_frequency" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'fortnightly', label: 'Fortnightly' },
                { value: 'four_weekly', label: 'Four Weekly' },
                { value: 'monthly', label: 'Monthly' }
              ]} />
              <InfoRow label="Notice Period (weeks)" value={employee.notice_period_weeks?.toString() || '1'} fieldName="notice_period_weeks" employeeId={employee.id} onUpdate={onUpdate} type="number" />
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-module-fg" />
              Compliance & Right to Work
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="National Insurance Number" value={employee.national_insurance_number || '\u2014'} fieldName="national_insurance_number" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Right to Work Status" value={employee.right_to_work_status || 'pending'} fieldName="right_to_work_status" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'pending', label: 'Pending' },
                { value: 'verified', label: 'Verified' },
                { value: 'expired', label: 'Expired' },
                { value: 'not_required', label: 'Not Required' }
              ]} />
              <InfoRow label="RTW Document Type" value={employee.right_to_work_document_type || '\u2014'} fieldName="right_to_work_document_type" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                { value: 'passport', label: 'Passport' },
                { value: 'biometric_residence_permit', label: 'Biometric Residence Permit' },
                { value: 'share_code', label: 'Share Code' },
                { value: 'visa', label: 'Visa' },
                { value: 'other', label: 'Other' }
              ]} />
              <InfoRow label="RTW Document Number" value={employee.right_to_work_document_number || '\u2014'} fieldName="right_to_work_document_number" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="RTW Expiry Date" value={formatDate(employee.right_to_work_expiry) || '\u2014'} fieldName="right_to_work_expiry" employeeId={employee.id} onUpdate={onUpdate} type="date" />
            </div>
            
            {/* DBS Section */}
            <div className="border-t border-white/[0.1] pt-4 mt-4">
              <h5 className="text-sm font-medium text-theme-primary mb-3">DBS Check</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InfoRow label="DBS Status" value={employee.dbs_status || 'not_required'} fieldName="dbs_status" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                  { value: 'not_required', label: 'Not Required' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'clear', label: 'Clear' },
                  { value: 'issues_found', label: 'Issues Found' }
                ]} />
                <InfoRow label="DBS Certificate Number" value={employee.dbs_certificate_number || '\u2014'} fieldName="dbs_certificate_number" employeeId={employee.id} onUpdate={onUpdate} />
                <InfoRow label="DBS Check Date" value={formatDate(employee.dbs_check_date) || '\u2014'} fieldName="dbs_check_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'banking' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-module-fg" />
              Bank Details
            </h4>
            <p className="text-sm text-theme-secondary mb-4">
              Bank details are used for payroll export only and are stored securely.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Bank Name" value={employee.bank_name || '\u2014'} fieldName="bank_name" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Account Holder Name" value={employee.bank_account_name || '\u2014'} fieldName="bank_account_name" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Sort Code" value={employee.bank_sort_code || '\u2014'} fieldName="bank_sort_code" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Account Number" value={employee.bank_account_number ? '\u2022\u2022\u2022\u2022' : '\u2014'} fieldName="bank_account_number" employeeId={employee.id} onUpdate={onUpdate} />
            </div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-module-fg" />
              Leave Allowance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Annual Leave Allowance (days)" value={employee.annual_leave_allowance?.toString() || '28'} fieldName="annual_leave_allowance" employeeId={employee.id} onUpdate={onUpdate} type="number" />
            </div>
            <p className="text-xs text-theme-tertiary mt-2">UK statutory minimum is 28 days (including bank holidays)</p>
          </div>
        )}

        {activeTab === 'pay' && (
          <div className="p-4 space-y-4">
            <h4 className="text-md font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-module-fg" />
              Pay & Tax Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Tax Code" value={employee.tax_code || '\u2014'} fieldName="tax_code" employeeId={employee.id} onUpdate={onUpdate} />
              <InfoRow label="Student Loan" value={employee.student_loan === true ? 'Yes' : (employee.student_loan === false ? 'No' : 'Not set')} fieldName="student_loan" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
              {employee.student_loan && (
                <InfoRow label="Student Loan Plan" value={employee.student_loan_plan || '\u2014'} fieldName="student_loan_plan" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
                  { value: 'plan_1', label: 'Plan 1' },
                  { value: 'plan_2', label: 'Plan 2' },
                  { value: 'plan_4', label: 'Plan 4' },
                  { value: 'plan_5', label: 'Plan 5' }
                ]} />
              )}
              <InfoRow label="Pension Enrolled" value={employee.pension_enrolled === true ? 'Yes' : (employee.pension_enrolled === false ? 'No' : '\u2014')} fieldName="pension_enrolled" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
              {employee.pension_enrolled && (
                <InfoRow label="Pension Contribution (%)" value={employee.pension_contribution_percent ? `${employee.pension_contribution_percent}%` : '\u2014'} fieldName="pension_contribution_percent" employeeId={employee.id} onUpdate={onUpdate} type="number" />
              )}
              <InfoRow label="P45 Received" value={employee.p45_received === true ? 'Yes' : (employee.p45_received === false ? 'No' : 'Not set')} fieldName="p45_received" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
              <InfoRow label="P45 Date" value={formatDate(employee.p45_date) || '\u2014'} fieldName="p45_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
              <InfoRow label="P45 Reference" value={employee.p45_reference || '\u2014'} fieldName="p45_reference" employeeId={employee.id} onUpdate={onUpdate} />
            </div>
          </div>
        )}

        {activeTab === 'training' && (
          <EmployeeTrainingEditor 
            data={employee} 
            onUpdate={onUpdate}
            mode="display"
            employeeId={employee.id}
            InfoRowComponent={InfoRow}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  );
}

