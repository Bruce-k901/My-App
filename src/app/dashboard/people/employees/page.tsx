'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
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
  Pencil,
  X,
  User,
  Briefcase,
  Shield,
  Save,
  CreditCard,
  Calendar,
  Loader2,
  Trash2,
  ChevronUp,
  GraduationCap,
  Edit,
} from 'lucide-react';
import type { EmergencyContact } from '@/types/peoplely';

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
  const router = useRouter();
  const { profile, company } = useAppContext();

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

  useEffect(() => {
    if (profile?.company_id) {
      console.log('Fetching employees for company:', profile.company_id, 'status filter:', statusFilter);
      fetchEmployees();
    } else {
      console.warn('No company_id in profile:', profile);
      
      // Run diagnostic to check profile status
      if (profile?.id) {
        supabase.rpc('diagnose_user_profile').then(({ data, error }) => {
          if (error) {
            console.error('Diagnostic error:', error);
          } else {
            console.log('🔍 Profile Diagnostic:', data);
            if (data && data.length > 0) {
              const diagnostic = data[0];
              if (!diagnostic.company_id) {
                console.error('❌ Profile has no company_id!', {
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

      // Check if company_id exists before calling RPC
      if (!profile.company_id) {
        console.warn('⚠️ Profile has no company_id - cannot fetch employees');
        console.log('Profile data:', { id: profile.id, email: profile.email, company_id: profile.company_id });
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Use the SECURITY DEFINER function to bypass RLS recursion
      console.log('🔍 Calling get_company_profiles with company_id:', profile.company_id);
      
      let rpcResult;
      try {
        rpcResult = await supabase.rpc('get_company_profiles', {
          p_company_id: profile.company_id
        });
        
        // Log the raw response
        console.log('🔍 Raw RPC response:', JSON.stringify(rpcResult, null, 2));
      } catch (rpcError: any) {
        console.error('❌ RPC call threw exception:', {
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
      
      console.log('📊 RPC result:', {
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
        console.log('✅ Sample employee from RPC:', data[0]);
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        console.log('⚠️ Data is object, not array:', data);
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
        console.log('❌❌❌ ERROR FETCHING EMPLOYEES (NOT SUPPRESSED):', errorDetails);
        
        if (typeof window !== 'undefined') {
          window.console.error('❌❌❌ Employee fetch error (window.console):', errorDetails);
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
        console.warn('⚠️ RPC returned null data');
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.error('❌ RPC returned non-array data:', typeof data, data);
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      if (data.length === 0) {
        console.log('ℹ️ No employees found in database for company:', profile.company_id);
        console.log('This could mean:');
        console.log('  1. No other employees exist in your company');
        console.log('  2. All employees have different company_id');
        console.log('  3. RLS is blocking the function');
        setEmployees([]);
        setLoading(false);
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
    if (!profile?.company_id) {
      console.warn('Cannot fetch sites: no company_id');
      return;
    }
    
    console.log('Fetching sites for company:', profile.company_id);
    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
      .eq('company_id', profile.company_id)
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
    if (!profile?.company_id) {
      console.warn('Cannot fetch managers: no company_id');
      return;
    }
    
    console.log('Fetching managers for company:', profile.company_id);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', profile.company_id)
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
    if (profile?.company_id) {
      fetchSites();
      fetchManagers();
    }
  }, [profile?.company_id]);

  const handleEdit = async (employee: Employee) => {
    console.log('handleEdit called for:', employee.full_name, employee.id);
    
    // Always load sites and managers before opening modal (like the detail page does)
    if (profile?.company_id) {
      console.log('Pre-loading sites and managers...', { sitesCount: sites.length, managersCount: managers.length });
      // Always fetch to ensure fresh data
      await Promise.all([fetchSites(), fetchManagers()]);
      // Give state time to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Always set the employee immediately to open the modal
    setEditingEmployee(employee);
    setEditFormData(employee);
    
    // Try to fetch full profile data using RPC function to bypass RLS
    if (!profile?.company_id) {
      console.warn('No company_id available, using existing employee data');
      // Set empty emergency contacts if no data
      setEmergencyContacts([]);
      return;
    }
    
    try {
      // Fetch full profile data directly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employee.id)
        .single();

      if (!profileError && profileData) {
        console.log('Full profile data loaded, updating form data');
        
        // Map profile data to form format
        const mappedData: any = {
          ...profileData,
          phone_number: profileData.phone_number || profileData.phone || '',
          contracted_hours: profileData.contracted_hours_per_week?.toString() || '',
          hourly_rate: profileData.hourly_rate ? (profileData.hourly_rate / 100).toString() : '', // Convert from pence
          salary: profileData.salary?.toString() || '',
          notice_period_weeks: profileData.notice_period_weeks?.toString() || '1',
          annual_leave_allowance: profileData.annual_leave_allowance?.toString() || '28',
          // Ensure all fields are properly mapped (including empty values)
          employee_number: profileData.employee_number || '',
          probation_end_date: profileData.probation_end_date || '',
          national_insurance_number: profileData.national_insurance_number || '',
          right_to_work_status: profileData.right_to_work_status || 'pending',
          right_to_work_expiry: profileData.right_to_work_expiry || '',
          right_to_work_document_type: profileData.right_to_work_document_type || '',
          dbs_status: profileData.dbs_status || 'not_required',
          dbs_certificate_number: profileData.dbs_certificate_number || '',
          dbs_check_date: profileData.dbs_check_date || '',
          bank_name: profileData.bank_name || '',
          bank_account_name: profileData.bank_account_name || '',
          bank_account_number: profileData.bank_account_number || '',
          bank_sort_code: profileData.bank_sort_code || '',
          // Pay & Tax fields
          tax_code: profileData.tax_code || '',
          student_loan: profileData.student_loan || false,
          student_loan_plan: profileData.student_loan_plan || '',
          pension_enrolled: profileData.pension_enrolled || false,
          pension_contribution_percent: profileData.pension_contribution_percent?.toString() || '',
          p45_received: profileData.p45_received || false,
          p45_date: profileData.p45_date || '',
          p45_reference: profileData.p45_reference || '',
          // Training fields
          food_safety_level: profileData.food_safety_level?.toString() || '',
          food_safety_expiry_date: profileData.food_safety_expiry_date || '',
          h_and_s_level: profileData.h_and_s_level?.toString() || '',
          h_and_s_expiry_date: profileData.h_and_s_expiry_date || '',
          fire_marshal_trained: profileData.fire_marshal_trained || false,
          fire_marshal_expiry_date: profileData.fire_marshal_expiry_date || '',
          first_aid_trained: profileData.first_aid_trained || false,
          first_aid_expiry_date: profileData.first_aid_expiry_date || '',
          cossh_trained: profileData.cossh_trained || false,
          cossh_expiry_date: profileData.cossh_expiry_date || '',
        };
        
        setEditingEmployee({ ...employee, ...mappedData });
        setEditFormData(mappedData);
        
        // Set emergency contacts
        if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
          setEmergencyContacts(profileData.emergency_contacts);
        } else {
          setEmergencyContacts([{ name: '', relationship: '', phone: '', email: '' }]);
        }
      } else {
        // Fallback to RPC data
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles', {
          p_company_id: profile.company_id
        });

        if (!rpcError && rpcData && Array.isArray(rpcData)) {
          const fullData = rpcData.find((e: any) => (e.profile_id || e.id) === employee.id);
          if (fullData) {
            const mappedData = {
              ...fullData,
              id: fullData.profile_id || fullData.id,
              phone_number: fullData.phone_number || fullData.phone || '',
            };
            setEditFormData({ ...employee, ...mappedData });
            setEmergencyContacts([]);
          }
        }
      }
    } catch (err) {
      console.error('Exception fetching employee:', err);
      setEmergencyContacts([]);
    }
  };

  const generateNextEmployeeNumber = async (): Promise<string | null> => {
    if (!profile?.company_id || !company?.name) return null;
    
    try {
      // Get first 3 letters of company name (uppercase, remove spaces/special chars)
      const companyPrefix = company.name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
      
      if (!companyPrefix || companyPrefix.length < 3) {
        console.warn('Company name too short for prefix');
        return null;
      }
      
      const prefix = `${companyPrefix}EMP`;
      
      // Get all existing employee numbers with this prefix
      const { data: existingEmployees, error } = await supabase
        .from('profiles')
        .select('employee_number')
        .eq('company_id', profile.company_id)
        .not('employee_number', 'is', null)
        .like('employee_number', `${prefix}%`);
      
      if (error) {
        console.error('Error fetching existing employee numbers:', error);
        return null;
      }
      
      // Extract numbers and find the highest
      let maxNumber = 0;
      if (existingEmployees && existingEmployees.length > 0) {
        existingEmployees.forEach((emp: any) => {
          const match = emp.employee_number?.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNumber) maxNumber = num;
          }
        });
      }
      
      // Generate next number (padded to 3 digits)
      const nextNumber = maxNumber + 1;
      return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (err) {
      console.error('Error generating employee number:', err);
      return null;
    }
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
        const generated = await generateNextEmployeeNumber();
        if (generated) {
          employeeNumber = generated;
          setEditFormData({ ...editFormData, employee_number: generated });
        }
      }
      
      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: any) => {
        if (value === '' || value === undefined) return null;
        return value;
      };

      // Prepare update data with proper conversions
      const updateData: any = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        phone_number: toNullIfEmpty(editFormData.phone_number),
        date_of_birth: toNullIfEmpty(editFormData.date_of_birth),
        gender: toNullIfEmpty(editFormData.gender),
        nationality: toNullIfEmpty(editFormData.nationality),
        address_line_1: toNullIfEmpty(editFormData.address_line_1),
        address_line_2: toNullIfEmpty(editFormData.address_line_2),
        city: toNullIfEmpty(editFormData.city),
        county: toNullIfEmpty(editFormData.county),
        postcode: toNullIfEmpty(editFormData.postcode),
        country: editFormData.country || 'United Kingdom',
        emergency_contacts: validEmergencyContacts.length > 0 ? validEmergencyContacts : null,
        
        // Employee number - use provided or generated, but allow null if explicitly cleared
        employee_number: toNullIfEmpty(employeeNumber),
        position_title: toNullIfEmpty(editFormData.position_title),
        department: toNullIfEmpty(editFormData.department),
        app_role: editFormData.app_role || 'Staff',
        home_site: toNullIfEmpty(editFormData.home_site),
        reports_to: toNullIfEmpty(editFormData.reports_to),
        start_date: toNullIfEmpty(editFormData.start_date),
        probation_end_date: toNullIfEmpty(editFormData.probation_end_date),
        contract_type: editFormData.contract_type || 'permanent',
        // Contracted hours - handle both field names and empty strings
        contracted_hours_per_week: editFormData.contracted_hours && editFormData.contracted_hours !== '' 
          ? parseFloat(editFormData.contracted_hours) 
          : (editFormData.contracted_hours_per_week && editFormData.contracted_hours_per_week !== '' 
            ? parseFloat(editFormData.contracted_hours_per_week.toString()) 
            : null),
        hourly_rate: editFormData.hourly_rate && editFormData.hourly_rate !== '' 
          ? Math.round(parseFloat(editFormData.hourly_rate) * 100) 
          : null, // Convert to pence
        salary: editFormData.salary && editFormData.salary !== '' 
          ? parseFloat(editFormData.salary) 
          : null,
        pay_frequency: editFormData.pay_frequency || 'monthly',
        notice_period_weeks: editFormData.notice_period_weeks && editFormData.notice_period_weeks !== '' 
          ? parseInt(editFormData.notice_period_weeks.toString()) 
          : 1,
        boh_foh: editFormData.boh_foh || 'FOH',
        
        // Compliance fields
        national_insurance_number: toNullIfEmpty(editFormData.national_insurance_number),
        right_to_work_status: editFormData.right_to_work_status || 'pending',
        right_to_work_expiry: toNullIfEmpty(editFormData.right_to_work_expiry),
        right_to_work_document_type: toNullIfEmpty(editFormData.right_to_work_document_type),
        dbs_status: editFormData.dbs_status || 'not_required',
        dbs_certificate_number: toNullIfEmpty(editFormData.dbs_certificate_number),
        dbs_check_date: toNullIfEmpty(editFormData.dbs_check_date),
        
        // Banking fields
        bank_name: toNullIfEmpty(editFormData.bank_name),
        bank_account_name: toNullIfEmpty(editFormData.bank_account_name),
        bank_account_number: toNullIfEmpty(editFormData.bank_account_number),
        bank_sort_code: toNullIfEmpty(editFormData.bank_sort_code),
        
        annual_leave_allowance: editFormData.annual_leave_allowance && editFormData.annual_leave_allowance !== '' 
          ? parseFloat(editFormData.annual_leave_allowance.toString()) 
          : 28,
        
        // Pay & Tax fields
        tax_code: toNullIfEmpty(editFormData.tax_code),
        student_loan: editFormData.student_loan || false,
        student_loan_plan: toNullIfEmpty(editFormData.student_loan_plan),
        pension_enrolled: editFormData.pension_enrolled || false,
        pension_contribution_percent: editFormData.pension_contribution_percent && editFormData.pension_contribution_percent !== '' 
          ? parseFloat(editFormData.pension_contribution_percent.toString()) 
          : null,
        p45_received: editFormData.p45_received || false,
        p45_date: toNullIfEmpty(editFormData.p45_date),
        p45_reference: toNullIfEmpty(editFormData.p45_reference),
        
        // Training fields
        food_safety_level: editFormData.food_safety_level && editFormData.food_safety_level !== '' 
          ? parseInt(editFormData.food_safety_level.toString()) 
          : null,
        food_safety_expiry_date: toNullIfEmpty(editFormData.food_safety_expiry_date),
        h_and_s_level: editFormData.h_and_s_level && editFormData.h_and_s_level !== '' 
          ? parseInt(editFormData.h_and_s_level.toString()) 
          : null,
        h_and_s_expiry_date: toNullIfEmpty(editFormData.h_and_s_expiry_date),
        fire_marshal_trained: editFormData.fire_marshal_trained || false,
        fire_marshal_expiry_date: toNullIfEmpty(editFormData.fire_marshal_expiry_date),
        first_aid_trained: editFormData.first_aid_trained || false,
        first_aid_expiry_date: toNullIfEmpty(editFormData.first_aid_expiry_date),
        cossh_trained: editFormData.cossh_trained || false,
        cossh_expiry_date: toNullIfEmpty(editFormData.cossh_expiry_date),
        
        status: editFormData.status || 'active',
      };

      // Log what we're about to save for debugging
      console.log('Saving employee data:', {
        employee_id: editingEmployee.id,
        updateData: {
          ...updateData,
          bank_account_number: updateData.bank_account_number ? '***' : null, // Don't log sensitive data
        }
      });

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingEmployee.id)
        .select();

      if (error) {
        console.error('Error updating employee:', error);
        console.error('Update data that failed:', updateData);
        alert(`Failed to update: ${error.message}`);
        return;
      }

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
        console.log('📢 Dispatching employeeUpdated event for:', editingEmployee.id);
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
            href="/dashboard/people/employees/new"
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

        {siteNames.length > 0 && (
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          >
            <option value="">All Sites</option>
            {siteNames.map(site => (
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
      <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all ${editingEmployee ? 'opacity-30 pointer-events-none' : ''}`}>
        {filteredEmployees.map((employee) => {
          const isExpanded = expandedEmployees.has(employee.id);
          const fullData = expandedEmployeeData.get(employee.id);
          const isLoadingData = loadingExpandedData.has(employee.id);
          
          return (
            <div
              key={employee.id}
              className={`bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-[#EC4899]/50 transition-colors group relative ${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}
            >
              {/* Edit Button and Expand Button - Positioned absolutely */}
              {!editingEmployee && (
                <div 
                  className="absolute top-2 right-2 z-10 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // Use fullData if available (when expanded), otherwise use employee
                      const employeeToEdit = expandedEmployeeData.get(employee.id) || employee;
                      handleEdit(employeeToEdit);
                    }}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white hover:text-[#EC4899] transition-all cursor-pointer active:scale-95 shadow-lg hover:shadow-[0_0_8px_rgba(236,72,153,0.5)]"
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
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white hover:text-[#EC4899] transition-all cursor-pointer active:scale-95"
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
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  // If clicking on button or its wrapper, don't navigate
                  if (target.closest('button') || target.closest('.absolute.top-2.right-2')) {
                    return;
                  }
                  // If expanded, clicking header collapses it
                  if (isExpanded) {
                    handleToggleExpand(employee.id);
                  } else {
                    // Otherwise navigate to detail page
                    router.push(`/dashboard/people/${employee.id}`);
                  }
                }}
                className={`cursor-pointer ${isExpanded ? 'pr-20' : 'pr-20'}`}
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

                {!isExpanded && (
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
                )}
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/[0.1]" onClick={(e) => e.stopPropagation()}>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#EC4899]" />
                      <span className="ml-2 text-neutral-400">Loading details...</span>
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
                      onUpdate={async () => {
                        // Reload expanded employee data after inline update
                        await loadExpandedEmployeeData(employee.id);
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-neutral-400">
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

      {/* Edit Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
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
        />
      )}
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
}: {
  employee: any;
  sites: { id: string; name: string }[];
  managers: { id: string; full_name: string }[];
  onEdit: () => void;
  onUpdate: () => void;
}) {
  const getSiteName = (siteId: string | null) => {
    if (!siteId) return '—';
    return sites.find(s => s.id === siteId)?.name || siteId;
  };

  const getManagerName = (managerId: string | null) => {
    if (!managerId) return '—';
    return managers.find(m => m.id === managerId)?.full_name || managerId;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number | string | null) => {
    if (!value && value !== 0) return '—';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    // If the value is likely in pence (large number), convert to pounds
    const displayValue = num > 1000 ? num / 100 : num;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(displayValue);
  };

  const emergencyContacts = Array.isArray(employee.emergency_contacts) 
    ? employee.emergency_contacts 
    : (employee.emergency_contacts ? [employee.emergency_contacts] : []);

  return (
    <div className="space-y-6">
      {/* Header with Edit button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Employee Details</h3>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg text-sm transition-all"
        >
          <Pencil className="w-4 h-4 inline mr-1" />
          Edit
        </button>
      </div>

      {/* Personal Information */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#EC4899]" />
          Personal Information
        </h4>
        <div className="space-y-1">
          <InfoRow label="Full Name" value={employee.full_name || '—'} fieldName="full_name" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Email" value={employee.email || '—'} fieldName="email" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Phone" value={employee.phone_number || employee.phone || '—'} fieldName="phone_number" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Date of Birth" value={formatDate(employee.date_of_birth) || '—'} fieldName="date_of_birth" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="Gender" value={employee.gender || '—'} fieldName="gender" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'non_binary', label: 'Non-binary' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            { value: 'other', label: 'Other' }
          ]} />
          <InfoRow label="Nationality" value={employee.nationality || '—'} fieldName="nationality" employeeId={employee.id} onUpdate={onUpdate} />
        </div>

        {/* Address */}
        <div className="mt-4 pt-4 border-t border-white/[0.1]">
          <h5 className="text-sm font-medium text-white mb-3">Address</h5>
          <div className="space-y-1">
            <InfoRow label="Address Line 1" value={employee.address_line_1 || '—'} fieldName="address_line_1" employeeId={employee.id} onUpdate={onUpdate} />
            <InfoRow label="Address Line 2" value={employee.address_line_2 || '—'} fieldName="address_line_2" employeeId={employee.id} onUpdate={onUpdate} />
            <InfoRow label="City" value={employee.city || '—'} fieldName="city" employeeId={employee.id} onUpdate={onUpdate} />
            <InfoRow label="County" value={employee.county || '—'} fieldName="county" employeeId={employee.id} onUpdate={onUpdate} />
            <InfoRow label="Postcode" value={employee.postcode || '—'} fieldName="postcode" employeeId={employee.id} onUpdate={onUpdate} />
            <InfoRow label="Country" value={employee.country || 'United Kingdom'} fieldName="country" employeeId={employee.id} onUpdate={onUpdate} />
          </div>
        </div>

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.1]">
            <h5 className="text-sm font-medium text-white mb-3">Emergency Contacts</h5>
            <div className="space-y-3">
              {emergencyContacts.map((contact: any, idx: number) => (
              <div key={idx} className="p-3 bg-white/[0.03] rounded">
                <div className="space-y-1">
                  <InfoRow label="Name" value={contact.name || '—'} />
                  <InfoRow label="Relationship" value={contact.relationship || '—'} />
                  <InfoRow label="Phone" value={contact.phone || '—'} />
                  <InfoRow label="Email" value={contact.email || '—'} />
                </div>
              </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employment Details */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#EC4899]" />
          Employment Details
        </h4>
        <div className="space-y-1">
          <InfoRow label="Employee Number" value={employee.employee_number || '—'} fieldName="employee_number" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Position / Job Title" value={employee.position_title || '—'} fieldName="position_title" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Department" value={employee.department || '—'} fieldName="department" employeeId={employee.id} onUpdate={onUpdate} />
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
          <InfoRow label="Start Date" value={formatDate(employee.start_date) || '—'} fieldName="start_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="Probation End Date" value={formatDate(employee.probation_end_date) || '—'} fieldName="probation_end_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="Contract Type" value={employee.contract_type || 'permanent'} fieldName="contract_type" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'permanent', label: 'Permanent' },
            { value: 'fixed_term', label: 'Fixed Term' },
            { value: 'zero_hours', label: 'Zero Hours' },
            { value: 'casual', label: 'Casual' },
            { value: 'agency', label: 'Agency' },
            { value: 'contractor', label: 'Contractor' },
            { value: 'apprentice', label: 'Apprentice' }
          ]} />
          <InfoRow label="Contracted Hours (per week)" value={employee.contracted_hours?.toString() || employee.contracted_hours_per_week?.toString() || '—'} fieldName="contracted_hours_per_week" employeeId={employee.id} onUpdate={onUpdate} type="number" />
          <InfoRow label="Hourly Rate" value={employee.hourly_rate ? formatCurrency(typeof employee.hourly_rate === 'string' ? parseFloat(employee.hourly_rate) : employee.hourly_rate) : '—'} fieldName="hourly_rate" employeeId={employee.id} onUpdate={onUpdate} type="number" />
          <InfoRow label="Annual Salary" value={formatCurrency(employee.salary) || '—'} fieldName="salary" employeeId={employee.id} onUpdate={onUpdate} type="number" />
          <InfoRow label="Pay Frequency" value={employee.pay_frequency || 'monthly'} fieldName="pay_frequency" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'fortnightly', label: 'Fortnightly' },
            { value: 'four_weekly', label: 'Four Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]} />
          <InfoRow label="Notice Period (weeks)" value={employee.notice_period_weeks?.toString() || '1'} fieldName="notice_period_weeks" employeeId={employee.id} onUpdate={onUpdate} type="number" />
        </div>
      </div>

      {/* Compliance */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#EC4899]" />
          Compliance & Right to Work
        </h4>
        <div className="space-y-1">
          <InfoRow label="National Insurance Number" value={employee.national_insurance_number || '—'} fieldName="national_insurance_number" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Right to Work Status" value={employee.right_to_work_status || 'pending'} fieldName="right_to_work_status" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'pending', label: 'Pending' },
            { value: 'verified', label: 'Verified' },
            { value: 'expired', label: 'Expired' },
            { value: 'not_required', label: 'Not Required' }
          ]} />
          <InfoRow label="RTW Document Type" value={employee.right_to_work_document_type || '—'} fieldName="right_to_work_document_type" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'passport', label: 'Passport' },
            { value: 'biometric_residence_permit', label: 'Biometric Residence Permit' },
            { value: 'share_code', label: 'Share Code' },
            { value: 'visa', label: 'Visa' },
            { value: 'other', label: 'Other' }
          ]} />
          <InfoRow label="RTW Expiry Date" value={formatDate(employee.right_to_work_expiry) || '—'} fieldName="right_to_work_expiry" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="DBS Status" value={employee.dbs_status || 'not_required'} fieldName="dbs_status" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: 'not_required', label: 'Not Required' },
            { value: 'pending', label: 'Pending' },
            { value: 'clear', label: 'Clear' },
            { value: 'issues_found', label: 'Issues Found' }
          ]} />
          <InfoRow label="DBS Certificate Number" value={employee.dbs_certificate_number || '—'} fieldName="dbs_certificate_number" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="DBS Check Date" value={formatDate(employee.dbs_check_date) || '—'} fieldName="dbs_check_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
        </div>
      </div>

      {/* Banking */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#EC4899]" />
          Bank Details
        </h4>
        <div className="space-y-1">
          <InfoRow label="Bank Name" value={employee.bank_name || '—'} fieldName="bank_name" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Account Holder Name" value={employee.bank_account_name || '—'} fieldName="bank_account_name" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Sort Code" value={employee.bank_sort_code || '—'} fieldName="bank_sort_code" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Account Number" value={employee.bank_account_number ? '••••' : '—'} fieldName="bank_account_number" employeeId={employee.id} onUpdate={onUpdate} />
        </div>
      </div>

      {/* Leave */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#EC4899]" />
          Leave Allowance
        </h4>
        <div className="space-y-1">
          <InfoRow label="Annual Leave Allowance (days)" value={employee.annual_leave_allowance?.toString() || '28'} fieldName="annual_leave_allowance" employeeId={employee.id} onUpdate={onUpdate} type="number" />
        </div>
      </div>

      {/* Pay & Tax */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#EC4899]" />
          Pay & Tax Details
        </h4>
        <div className="space-y-1">
          <InfoRow label="Tax Code" value={employee.tax_code || '—'} fieldName="tax_code" employeeId={employee.id} onUpdate={onUpdate} />
          <InfoRow label="Student Loan" value={employee.student_loan === true ? 'Yes' : (employee.student_loan === false ? 'No' : 'Not set')} fieldName="student_loan" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          {employee.student_loan && (
            <InfoRow label="Student Loan Plan" value={employee.student_loan_plan || '—'} fieldName="student_loan_plan" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
              { value: 'plan_1', label: 'Plan 1' },
              { value: 'plan_2', label: 'Plan 2' },
              { value: 'plan_4', label: 'Plan 4' },
              { value: 'plan_5', label: 'Plan 5' }
            ]} />
          )}
          <InfoRow label="Pension Enrolled" value={employee.pension_enrolled === true ? 'Yes' : (employee.pension_enrolled === false ? 'No' : '—')} fieldName="pension_enrolled" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          <InfoRow label="Pension Contribution (%)" value={employee.pension_contribution_percent ? `${employee.pension_contribution_percent}%` : '—'} fieldName="pension_contribution_percent" employeeId={employee.id} onUpdate={onUpdate} type="number" />
          <InfoRow label="P45 Received" value={employee.p45_received === true ? 'Yes' : (employee.p45_received === false ? 'No' : 'Not set')} fieldName="p45_received" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          <InfoRow label="P45 Date" value={formatDate(employee.p45_date) || '—'} fieldName="p45_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="P45 Reference" value={employee.p45_reference || '—'} fieldName="p45_reference" employeeId={employee.id} onUpdate={onUpdate} />
        </div>
      </div>

      {/* Training */}
      <div className="border border-white/[0.1] rounded-lg p-4 bg-white/[0.02]">
        <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#EC4899]" />
          Training & Certifications
        </h4>
        <div className="space-y-1">
          <InfoRow label="Food Safety Level" value={employee.food_safety_level ? `Level ${employee.food_safety_level}` : '—'} fieldName="food_safety_level" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: '2', label: 'Level 2' },
            { value: '3', label: 'Level 3' },
            { value: '4', label: 'Level 4' },
            { value: '5', label: 'Level 5' }
          ]} />
          <InfoRow label="Food Safety Expiry" value={formatDate(employee.food_safety_expiry_date) || '—'} fieldName="food_safety_expiry_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="H&S Level" value={employee.h_and_s_level ? `Level ${employee.h_and_s_level}` : '—'} fieldName="h_and_s_level" employeeId={employee.id} onUpdate={onUpdate} type="select" options={[
            { value: '2', label: 'Level 2' },
            { value: '3', label: 'Level 3' },
            { value: '4', label: 'Level 4' }
          ]} />
          <InfoRow label="H&S Expiry" value={formatDate(employee.h_and_s_expiry_date) || '—'} fieldName="h_and_s_expiry_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          <InfoRow label="Fire Marshal Trained" value={employee.fire_marshal_trained ? 'Yes' : 'No'} fieldName="fire_marshal_trained" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          {employee.fire_marshal_trained && (
            <InfoRow label="Fire Marshal Expiry" value={formatDate(employee.fire_marshal_expiry_date) || '—'} fieldName="fire_marshal_expiry_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          )}
          <InfoRow label="First Aid Trained" value={employee.first_aid_trained ? 'Yes' : 'No'} fieldName="first_aid_trained" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          {employee.first_aid_trained && (
            <InfoRow label="First Aid Expiry" value={formatDate(employee.first_aid_expiry_date) || '—'} fieldName="first_aid_expiry_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          )}
          <InfoRow label="COSSH Trained" value={employee.cossh_trained ? 'Yes' : 'No'} fieldName="cossh_trained" employeeId={employee.id} onUpdate={onUpdate} type="boolean" />
          {employee.cossh_trained && (
            <InfoRow label="COSSH Expiry" value={formatDate(employee.cossh_expiry_date) || '—'} fieldName="cossh_expiry_date" employeeId={employee.id} onUpdate={onUpdate} type="date" />
          )}
        </div>
      </div>
    </div>
  );
}

// InfoRow component with inline editing
function InfoRow({ 
  label, 
  value, 
  status,
  fieldName,
  employeeId,
  onUpdate,
  type = 'text',
  options,
  actualValue
}: { 
  label: string; 
  value: string; 
  status?: 'success' | 'warning' | 'error';
  fieldName?: string;
  employeeId?: string;
  onUpdate?: () => void;
  type?: 'text' | 'date' | 'number' | 'select' | 'boolean' | 'textarea';
  options?: { value: string; label: string }[];
  actualValue?: string | null; // For select fields, the actual stored value (UUID, etc.)
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => {
    // For select fields with actualValue prop, use the actual value (UUID, etc.)
    if (type === 'select' && actualValue !== undefined && actualValue !== null) {
      return actualValue || '';
    }
    // For select fields with actualValue prop, use the actual value (UUID, etc.)
    if (type === 'select' && actualValue !== undefined && actualValue !== null) {
      return actualValue || '';
    }
    // Convert date display value back to ISO format for editing
    if (type === 'date' && value && value !== 'Not set' && value !== 'N/A' && value !== '—' && value !== 'No expiry') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Invalid date, return as is
      }
    }
    // For boolean type, convert "Yes"/"No" to true/false string
    if (type === 'boolean') {
      if (value === 'Yes') return 'true';
      if (value === 'No') return 'false';
      return '';
    }
    // For number type, extract number from display values like "Level 2" or "£10.50"
    if (type === 'number' && value && value !== '—' && value !== 'Not set') {
      // Extract number from strings like "Level 2", "£10.50", "10.50%"
      const match = value.match(/[\d.]+/);
      if (match) {
        return match[0];
      }
    }
    // For select type without actualValue, try to find matching option by label
    if (type === 'select' && options && value !== '—' && value !== 'Not set' && value !== '') {
      const matchingOption = options.find(opt => opt.label === value);
      if (matchingOption) {
        return matchingOption.value;
      }
    }
    return value === '—' ? '' : value;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fieldName || !employeeId) {
      setIsEditing(false);
      return;
    }
    
    // For select fields, compare with actualValue if provided
    const currentValue = type === 'select' && actualValue !== undefined ? actualValue : value;
    if (editValue === currentValue || (type === 'select' && editValue === '' && (!actualValue || actualValue === ''))) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {};
      
      // Convert value based on type
      if (type === 'number') {
        // For hourly_rate, convert from pounds to pence (multiply by 100)
        // For other numbers, parse as float
        const numValue = editValue ? parseFloat(editValue) : null;
        if (fieldName === 'hourly_rate' && numValue !== null) {
          updateData[fieldName] = Math.round(numValue * 100); // Convert to pence
        } else {
          updateData[fieldName] = numValue;
        }
      } else if (type === 'boolean') {
        updateData[fieldName] = editValue === 'true' || editValue === 'Yes';
      } else if (type === 'date') {
        updateData[fieldName] = editValue || null;
      } else if (type === 'select') {
        // For select fields, empty string means null/not set
        updateData[fieldName] = editValue === '' || editValue === 'Not set' ? null : editValue;
      } else {
        updateData[fieldName] = editValue === '' ? null : editValue;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', employeeId);

      if (error) throw error;

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('Error updating field:', err);
      alert(`Failed to update ${label}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original value format
    if (type === 'date' && value && value !== 'Not set' && value !== 'N/A' && value !== '—' && value !== 'No expiry') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setEditValue(date.toISOString().split('T')[0]);
        } else {
          setEditValue(value === '—' ? '' : value);
        }
      } catch (e) {
        setEditValue(value === '—' ? '' : value);
      }
    } else {
      setEditValue(value === '—' ? '' : value);
    }
    setIsEditing(false);
  };

  if (!fieldName || !employeeId) {
    // Non-editable row
    return (
      <div className="flex justify-between py-2 border-b border-neutral-700">
        <span className="text-neutral-400 text-sm">{label}</span>
        <span className={`text-right text-sm ${
          status === 'success' ? 'text-green-400' :
          status === 'warning' ? 'text-amber-400' :
          status === 'error' ? 'text-red-400' :
          'text-white'
        }`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-neutral-700 group">
      <span className="text-neutral-400 text-sm">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {isEditing ? (
          <>
            {type === 'select' && options ? (
              <select
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                autoFocus
              >
                <option value="">Not set</option>
                {options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'boolean' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                autoFocus
              >
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : type === 'date' ? (
              <input
                type="date"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                autoFocus
              />
            ) : type === 'number' ? (
              <input
                type="number"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                autoFocus
              />
            ) : type === 'textarea' ? (
              <textarea
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                rows={2}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-white text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded disabled:opacity-50"
            >
              {saving ? '...' : '✓'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded disabled:opacity-50"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span className={`text-right text-sm ${
              status === 'success' ? 'text-green-400' :
              status === 'warning' ? 'text-amber-400' :
              status === 'error' ? 'text-red-400' :
              'text-white'
            }`}>
              {value}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[#EC4899] hover:text-[#EC4899]/80 text-xs transition-opacity"
              title="Edit"
            >
              <Edit className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Edit Employee Modal Component
function EditEmployeeModal({
  employee,
  formData,
  setFormData,
  emergencyContacts,
  setEmergencyContacts,
  sites,
  managers,
  onClose,
  onSave,
  saving
}: {
  employee: Employee;
  formData: any;
  setFormData: (data: any) => void;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  sites: { id: string; name: string }[];
  managers: { id: string; full_name: string }[];
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'compliance' | 'banking' | 'leave' | 'pay' | 'training'>('personal');

  // Debug: Log sites and managers when modal opens or they change
  React.useEffect(() => {
    console.log('EditEmployeeModal - sites:', sites?.length || 0, sites);
    console.log('EditEmployeeModal - managers:', managers?.length || 0, managers);
    console.log('EditEmployeeModal - formData.home_site:', formData.home_site);
    console.log('EditEmployeeModal - formData.reports_to:', formData.reports_to);
    console.log('EditEmployeeModal - formData keys:', Object.keys(formData || {}));
  }, [sites, managers, formData]);


  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      updateField(name, checked);
    } else {
      updateField(name, value);
    }
  };

  const handleEmergencyContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', relationship: '', phone: '', email: '' }]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  // Force re-render when sites/managers change
  const sitesKey = `sites-${sites?.length || 0}-${sites?.map(s => s.id).join(',') || ''}`;
  const managersKey = `managers-${managers?.length || 0}-${managers?.map(m => m.id).join(',') || ''}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()} key={`modal-${sitesKey}-${managersKey}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Edit Employee</h2>
            <p className="text-neutral-400 mt-1">{employee.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-neutral-800 overflow-x-auto">
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
                    ? 'bg-neutral-800 text-white border-b-2 border-[#EC4899]'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#EC4899]" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Address */}
              <div className="border-t border-neutral-700 pt-4">
                <h3 className="text-md font-medium text-white mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="address_line_1"
                      value={formData.address_line_1 || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="address_line_2"
                      value={formData.address_line_2 || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      County
                    </label>
                    <input
                      type="text"
                      name="county"
                      value={formData.county || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Postcode
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country || 'United Kingdom'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              
              {/* Emergency Contacts */}
              <div className="border-t border-neutral-700 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-white">Emergency Contacts</h3>
                  <button
                    type="button"
                    onClick={addEmergencyContact}
                    className="flex items-center gap-1 text-sm text-[#EC4899] hover:text-[#EC4899]/80"
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>
                
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-neutral-700/30 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={contact.relationship}
                        onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                        placeholder="e.g., Spouse, Parent"
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => handleEmergencyContactChange(index, 'email', e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                        />
                      </div>
                      {emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#EC4899]" />
                Employment Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Employee Number
                  </label>
                  <input
                    type="text"
                    name="employee_number"
                    value={formData.employee_number || ''}
                    onChange={handleChange}
                    placeholder="e.g., EMP001"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Position / Job Title
                  </label>
                  <input
                    type="text"
                    name="position_title"
                    value={formData.position_title || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    App Role
                  </label>
                  <select
                    name="app_role"
                    value={formData.app_role || 'Staff'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Owner">Owner</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Home Site
                  </label>
                  <select
                    name="home_site"
                    value={formData.home_site || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select site...</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Reports To
                  </label>
                  <select
                    name="reports_to"
                    value={formData.reports_to || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select manager...</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    BOH / FOH
                  </label>
                  <select
                    name="boh_foh"
                    value={formData.boh_foh || 'FOH'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="FOH">Front of House</option>
                    <option value="BOH">Back of House</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Probation End Date
                  </label>
                  <input
                    type="date"
                    name="probation_end_date"
                    value={formData.probation_end_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Contract Type
                  </label>
                  <select
                    name="contract_type"
                    value={formData.contract_type || 'permanent'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="fixed_term">Fixed Term</option>
                    <option value="zero_hours">Zero Hours</option>
                    <option value="casual">Casual</option>
                    <option value="agency">Agency</option>
                    <option value="contractor">Contractor</option>
                    <option value="apprentice">Apprentice</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Contracted Hours (per week)
                  </label>
                  <input
                    type="number"
                    name="contracted_hours"
                    value={formData.contracted_hours || ''}
                    onChange={handleChange}
                    step="0.5"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Hourly Rate (£)
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate || ''}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Annual Salary (£)
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary || ''}
                    onChange={handleChange}
                    step="100"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Pay Frequency
                  </label>
                  <select
                    name="pay_frequency"
                    value={formData.pay_frequency || 'monthly'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="four_weekly">Four Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Notice Period (weeks)
                  </label>
                  <input
                    type="number"
                    name="notice_period_weeks"
                    value={formData.notice_period_weeks || '1'}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#EC4899]" />
                Compliance & Right to Work
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    National Insurance Number
                  </label>
                  <input
                    type="text"
                    name="national_insurance_number"
                    value={formData.national_insurance_number || ''}
                    onChange={handleChange}
                    placeholder="e.g., AB123456C"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Right to Work Status
                  </label>
                  <select
                    name="right_to_work_status"
                    value={formData.right_to_work_status || 'pending'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="verified">Verified</option>
                    <option value="expired">Expired</option>
                    <option value="not_required">Not Required</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    RTW Document Type
                  </label>
                  <select
                    name="right_to_work_document_type"
                    value={formData.right_to_work_document_type || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="passport">UK/EU Passport</option>
                    <option value="biometric_residence_permit">Biometric Residence Permit</option>
                    <option value="share_code">Share Code</option>
                    <option value="visa">Visa</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    RTW Expiry Date
                  </label>
                  <input
                    type="date"
                    name="right_to_work_expiry"
                    value={formData.right_to_work_expiry || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-400 mt-1">Leave blank if no expiry (e.g., British citizen)</p>
                </div>
              </div>
              
              {/* DBS Section */}
              <div className="border-t border-neutral-700 pt-4">
                <h3 className="text-md font-medium text-white mb-4">DBS Check</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      DBS Status
                    </label>
                    <select
                      name="dbs_status"
                      value={formData.dbs_status || 'not_required'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    >
                      <option value="not_required">Not Required</option>
                      <option value="pending">Pending</option>
                      <option value="clear">Clear</option>
                      <option value="issues_found">Issues Found</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      DBS Certificate Number
                    </label>
                    <input
                      type="text"
                      name="dbs_certificate_number"
                      value={formData.dbs_certificate_number || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      DBS Check Date
                    </label>
                    <input
                      type="date"
                      name="dbs_check_date"
                      value={formData.dbs_check_date || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#EC4899]" />
                Bank Details
              </h2>
              <p className="text-sm text-neutral-400">
                Bank details are used for payroll export only and are stored securely.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="bank_account_name"
                    value={formData.bank_account_name || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Sort Code
                  </label>
                  <input
                    type="text"
                    name="bank_sort_code"
                    value={formData.bank_sort_code || ''}
                    onChange={handleChange}
                    placeholder="XX-XX-XX"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number || ''}
                    onChange={handleChange}
                    placeholder="8 digits"
                    maxLength={8}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#EC4899]" />
                Leave Allowance
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Annual Leave Allowance (days)
                  </label>
                  <input
                    type="number"
                    name="annual_leave_allowance"
                    value={formData.annual_leave_allowance || '28'}
                    onChange={handleChange}
                    step="0.5"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-400 mt-1">UK statutory minimum is 28 days (including bank holidays)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pay' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#EC4899]" />
                Pay & Tax Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Tax Code
                  </label>
                  <input
                    type="text"
                    name="tax_code"
                    value={formData.tax_code || ''}
                    onChange={handleChange}
                    placeholder="e.g., 1257L"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Student Loan
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="student_loan"
                      checked={formData.student_loan || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('student_loan', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">Has student loan</span>
                  </div>
                </div>
                
                {formData.student_loan && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Student Loan Plan
                    </label>
                    <select
                      name="student_loan_plan"
                      value={formData.student_loan_plan || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    >
                      <option value="">Select plan...</option>
                      <option value="plan_1">Plan 1</option>
                      <option value="plan_2">Plan 2</option>
                      <option value="plan_4">Plan 4</option>
                      <option value="plan_5">Plan 5</option>
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Pension Enrolled
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="pension_enrolled"
                      checked={formData.pension_enrolled || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('pension_enrolled', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">Enrolled in pension</span>
                  </div>
                </div>
                
                {formData.pension_enrolled && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Pension Contribution (%)
                    </label>
                    <input
                      type="number"
                      name="pension_contribution_percent"
                      value={formData.pension_contribution_percent || ''}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    P45 Received
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="p45_received"
                      checked={formData.p45_received || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('p45_received', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">P45 received</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    P45 Date
                  </label>
                  <input
                    type="date"
                    name="p45_date"
                    value={formData.p45_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    P45 Reference
                  </label>
                  <input
                    type="text"
                    name="p45_reference"
                    value={formData.p45_reference || ''}
                    onChange={handleChange}
                    placeholder="P45 reference number"
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#EC4899]" />
                Training & Certifications
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Food Safety Level
                  </label>
                  <select
                    name="food_safety_level"
                    value={formData.food_safety_level || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select level...</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Food Safety Expiry Date
                  </label>
                  <input
                    type="date"
                    name="food_safety_expiry_date"
                    value={formData.food_safety_expiry_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    H&S Level
                  </label>
                  <select
                    name="h_and_s_level"
                    value={formData.h_and_s_level || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Select level...</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    H&S Expiry Date
                  </label>
                  <input
                    type="date"
                    name="h_and_s_expiry_date"
                    value={formData.h_and_s_expiry_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Fire Marshal Trained
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="fire_marshal_trained"
                      checked={formData.fire_marshal_trained || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('fire_marshal_trained', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">Fire marshal trained</span>
                  </div>
                </div>
                
                {formData.fire_marshal_trained && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      Fire Marshal Expiry Date
                    </label>
                    <input
                      type="date"
                      name="fire_marshal_expiry_date"
                      value={formData.fire_marshal_expiry_date || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    First Aid Trained
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="first_aid_trained"
                      checked={formData.first_aid_trained || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('first_aid_trained', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">First aid trained</span>
                  </div>
                </div>
                
                {formData.first_aid_trained && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      First Aid Expiry Date
                    </label>
                    <input
                      type="date"
                      name="first_aid_expiry_date"
                      value={formData.first_aid_expiry_date || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    COSSH Trained
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      name="cossh_trained"
                      checked={formData.cossh_trained || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateField('cossh_trained', checked);
                      }}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">COSSH trained</span>
                  </div>
                </div>
                
                {formData.cossh_trained && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">
                      COSSH Expiry Date
                    </label>
                    <input
                      type="date"
                      name="cossh_expiry_date"
                      value={formData.cossh_expiry_date || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple Form Field Component
function SimpleFormField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899] transition-colors"
      />
    </div>
  );
}

// Simple Form Select Component
function SimpleFormSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-300 mb-1.5">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899] transition-colors"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

