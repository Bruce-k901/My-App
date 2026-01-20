'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft,
  User, 
  FileText, 
  Calendar, 
  GraduationCap, 
  Target, 
  MessageSquare, 
  Clock, 
  Shield, 
  CreditCard, 
  AlertTriangle,
  Edit,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  X,
  Save,
  CreditCard as CreditCardIcon,
  Loader2,
  Trash2,
  Plus,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import type { EmergencyContact } from '@/types/teamly';
import EmployeeSiteAssignmentsModal from '@/components/people/EmployeeSiteAssignmentsModal';

type TabType = 'overview' | 'documents' | 'leave' | 'training' | 'attendance' | 'notes' | 'pay';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  position_title: string | null;
  department: string | null;
  app_role: string;
  status: string;
  boh_foh: string | null;
  
  // Personal
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  emergency_contacts: any[] | null;
  
  // Employment
  employee_number: string | null;
  start_date: string | null;
  probation_end_date: string | null;
  contract_type: string | null;
  contracted_hours: number | null;
  hourly_rate: number | null;
  salary: number | null;
  pay_frequency: string | null;
  notice_period_weeks: number | null;
  reports_to: string | null;
  home_site: string | null;
  sites?: { name: string } | null;
  manager?: { full_name: string } | null;
  
  // Compliance
  national_insurance_number: string | null;
  right_to_work_status: string | null;
  right_to_work_expiry: string | null;
  dbs_status: string | null;
  dbs_certificate_number: string | null;
  dbs_check_date: string | null;
  
  // Banking
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  
  // Leave
  annual_leave_allowance: number | null;
  
  // Pay & Tax
  tax_code: string | null;
  student_loan: boolean | null;
  student_loan_plan: string | null;
  pension_enrolled: boolean | null;
  pension_contribution_percent: number | null;
  p45_received: boolean | null;
  
  // Training
  food_safety_level: number | null;
  food_safety_expiry_date: string | null;
  h_and_s_level: number | null;
  h_and_s_expiry_date: string | null;
  fire_marshal_trained: boolean | null;
  fire_marshal_expiry_date: string | null;
  first_aid_trained: boolean | null;
  first_aid_expiry_date: string | null;
  cossh_trained: boolean | null;
  cossh_expiry_date: string | null;
  
  // Relations
  home_site?: string | null;
  sites?: { name: string } | null;
  manager?: { full_name: string } | null;
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profile: currentUser, company } = useAppContext();
  const employeeId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [saving, setSaving] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: string; full_name: string }[]>([]);
  const [showSiteAssignmentsModal, setShowSiteAssignmentsModal] = useState(false);
  const [siteAssignmentsEmployee, setSiteAssignmentsEmployee] = useState<Employee | null>(null);
  
  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  // Fetch sites and managers when currentUser is available
  useEffect(() => {
    console.log('🔍 Checking for currentUser:', { 
      hasCurrentUser: !!currentUser, 
      companyId: currentUser?.company_id 
    });
    if (currentUser?.company_id) {
      console.log('✅ Fetching sites and managers for company:', currentUser.company_id);
      fetchSites();
      fetchManagers();
    } else {
      console.log('⚠️ Cannot fetch sites/managers: no currentUser or company_id');
    }
  }, [currentUser?.company_id]);

  // Refresh employee data when window regains focus or when employee is updated
  useEffect(() => {
    const handleFocus = () => {
      if (employeeId) {
        console.log('🔄 Window focus - refreshing employee data');
        setLoading(true);
        fetchEmployee();
      }
    };

    const handleEmployeeUpdate = (event: CustomEvent) => {
      console.log('🔄 Employee update event received:', event.detail);
      if (event.detail?.employeeId === employeeId) {
        console.log('✅ Employee ID matches - refreshing employee data');
        setLoading(true);
        fetchEmployee();
      }
    };

    // Also listen for storage events (alternative method)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `employee_updated_${employeeId}`) {
        console.log('🔄 Storage event - refreshing employee data');
        setLoading(true);
        fetchEmployee();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('employeeUpdated', handleEmployeeUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('employeeUpdated', handleEmployeeUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [employeeId]);

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      console.log('📥 Fetching employee data for:', employeeId);
      
      // Try direct query first for fresh data (bypasses potential RPC caching)
      const { data: directData, error: directError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .maybeSingle();
      
      if (!directError && directData) {
        console.log('✅ Got fresh data from direct query');
        
        // Get site name and manager name separately
        let siteName = null;
        let managerName = null;
        
        if (directData.home_site) {
          const { data: siteData } = await supabase
            .from('sites')
            .select('name')
            .eq('id', directData.home_site)
            .maybeSingle();
          siteName = siteData?.name || null;
        }
        
        if (directData.reports_to) {
          // Try to get manager name from direct query
          const { data: managerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', directData.reports_to)
            .maybeSingle();
          managerName = managerData?.full_name || null;
        }
        
        // Map direct query data to Employee format
        const mergedData = {
          ...directData,
          id: directData.id,
          phone_number: directData.phone_number || directData.phone || null,
          contracted_hours: directData.contracted_hours_per_week || directData.contracted_hours || null,
          sites: siteName ? { name: siteName } : null,
          manager: managerName ? { full_name: managerName } : null,
        };
        
        console.log('📊 Setting employee data:', mergedData);
        setEmployee(mergedData as Employee);
        setLoading(false);
        return;
      }
      
      // Fallback to RPC function if direct query fails (due to RLS)
      if (currentUser?.company_id) {
        console.log('⚠️ Direct query failed, trying RPC function');
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_company_profiles', {
          p_company_id: currentUser.company_id
        });
        
        if (!rpcError && rpcData && Array.isArray(rpcData)) {
          // Find the employee in the RPC results
          const employeeData = rpcData.find((p: any) => (p.profile_id || p.id) === employeeId);
          
          if (employeeData) {
            console.log('✅ Got data from RPC function');
            // Get site name and manager name separately
            let siteName = null;
            let managerName = null;
            
            if (employeeData.home_site) {
              const { data: siteData } = await supabase
                .from('sites')
                .select('name')
                .eq('id', employeeData.home_site)
                .maybeSingle();
              siteName = siteData?.name || null;
            }
            
            if (employeeData.reports_to) {
              const managerProfile = rpcData.find((p: any) => (p.profile_id || p.id) === employeeData.reports_to);
              managerName = managerProfile?.full_name || null;
            }
            
            // Use RPC data directly - it should contain all profile fields
            // Map RPC format to Employee format
            const mergedData = {
              ...employeeData,
              id: employeeData.profile_id || employeeData.id,
              phone_number: employeeData.phone_number || employeeData.phone || null,
              contracted_hours: employeeData.contracted_hours_per_week || employeeData.contracted_hours || null,
              sites: siteName ? { name: siteName } : null,
              manager: managerName ? { full_name: managerName } : null,
            };
            
            console.log('📊 Setting employee data from RPC:', mergedData);
            setEmployee(mergedData as Employee);
            setLoading(false);
            return;
          }
        }
      }
      
      // Fallback: If both methods failed, show not found
      console.warn('Employee not found in RPC results or RPC failed');
      setEmployee(null);
      setLoading(false);
    } catch (err: any) {
      const errorDetails: any = {
        message: err?.message || 'Unknown exception',
        stack: err?.stack || null,
        errorType: typeof err,
      };
      
      try {
        errorDetails.errorString = String(err);
        errorDetails.errorKeys = err ? Object.keys(err) : [];
        errorDetails.errorJSON = JSON.stringify(err, Object.getOwnPropertyNames(err));
      } catch (e) {
        errorDetails.serializationError = String(e);
      }
      
      console.error('Exception fetching employee:', errorDetails);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    console.log('🔍 fetchSites called, currentUser:', { 
      hasCurrentUser: !!currentUser, 
      companyId: currentUser?.company_id 
    });
    
    if (!currentUser?.company_id) {
      console.log('⚠️ Cannot fetch sites: no company_id');
      return;
    }
    
    try {
      console.log('📡 Fetching sites from Supabase for company:', currentUser.company_id);
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', currentUser.company_id)
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching sites:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setSites([]);
      } else {
        console.log('✅ Fetched sites:', data?.length || 0, data);
        setSites(data || []);
      }
    } catch (err: any) {
      console.error('❌ Exception fetching sites:', err);
      console.error('Exception details:', {
        message: err?.message,
        stack: err?.stack
      });
      setSites([]);
    }
  };

  const fetchManagers = async () => {
    if (!currentUser?.company_id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('company_id', currentUser.company_id)
      .in('app_role', ['Manager', 'Admin', 'Owner'])
      .order('full_name');
    
    setManagers(data || []);
  };

  const generateNextEmployeeNumber = async (): Promise<string | null> => {
    if (!currentUser?.company_id) return null;
    
    try {
      // Get company name - try from context first, then fetch from DB
      let companyName: string | null = company?.name || null;
      
      if (!companyName) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', currentUser.company_id)
          .single();
        
        companyName = companyData?.name || null;
      }
      
      if (!companyName) {
        console.warn('Could not get company name for employee number generation');
        return null;
      }
      
      const companyPrefix = companyName
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
      
      if (!companyPrefix || companyPrefix.length < 3) return null;
      
      const prefix = `${companyPrefix}EMP`;
      const { data: existingEmployees, error } = await supabase
        .from('profiles')
        .select('employee_number')
        .eq('company_id', currentUser.company_id)
        .not('employee_number', 'is', null)
        .like('employee_number', `${prefix}%`);
      
      if (error) return null;
      
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
      
      const nextNumber = maxNumber + 1;
      return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    } catch (err) {
      return null;
    }
  };

  const handleEdit = async () => {
    if (!employee) return;
    
    console.log('handleEdit called for:', employee.full_name, employee.id);
    
    if (!currentUser?.company_id) {
      setEmergencyContacts([]);
      return;
    }
    
    try {
      // Ensure dropdown data is loaded before opening the modal
      await Promise.all([fetchSites(), fetchManagers()]);

      // Open modal with base employee info immediately after dropdowns are ready
      setEditingEmployee(employee);
      setEditFormData(employee);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employee.id)
        .single();

      if (!profileError && profileData) {
        const mappedData: any = {
          ...profileData,
          phone_number: profileData.phone_number || profileData.phone || '',
          contracted_hours: profileData.contracted_hours_per_week?.toString() || '',
          hourly_rate: profileData.hourly_rate ? (profileData.hourly_rate / 100).toString() : '',
          salary: profileData.salary?.toString() || '',
          notice_period_weeks: profileData.notice_period_weeks?.toString() || '1',
          annual_leave_allowance: profileData.annual_leave_allowance?.toString() || '28',
          // Pay & Tax fields
          tax_code: profileData.tax_code || '',
          student_loan: profileData.student_loan || false,
          student_loan_plan: profileData.student_loan_plan || '',
          pension_enrolled: profileData.pension_enrolled || false,
          pension_contribution_percent: profileData.pension_contribution_percent?.toString() || '',
          p45_received: profileData.p45_received || false,
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
        
        if (profileData.emergency_contacts && Array.isArray(profileData.emergency_contacts)) {
          setEmergencyContacts(profileData.emergency_contacts);
        } else {
          setEmergencyContacts([{ name: '', relationship: '', phone: '', email: '' }]);
        }
      }
    } catch (err) {
      console.error('Exception fetching employee:', err);
      setEmergencyContacts([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    
    setSaving(true);
    try {
      // Helper function to convert empty strings to null
      const toNullIfEmpty = (value: any) => {
        if (value === '' || value === undefined) return null;
        return value;
      };

      const validEmergencyContacts = emergencyContacts.filter(c => c.name && c.phone);
      
      let employeeNumber = editFormData.employee_number;
      if (!employeeNumber || employeeNumber.trim() === '') {
        const generated = await generateNextEmployeeNumber();
        if (generated) {
          employeeNumber = generated;
          setEditFormData({ ...editFormData, employee_number: generated });
        }
      }
      
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
        
        employee_number: toNullIfEmpty(employeeNumber),
        position_title: toNullIfEmpty(editFormData.position_title),
        department: toNullIfEmpty(editFormData.department),
        app_role: editFormData.app_role || 'Staff',
        home_site: toNullIfEmpty(editFormData.home_site),
        reports_to: toNullIfEmpty(editFormData.reports_to),
        start_date: toNullIfEmpty(editFormData.start_date),
        probation_end_date: toNullIfEmpty(editFormData.probation_end_date),
        contract_type: editFormData.contract_type || 'permanent',
        // Handle both field name variations
        contracted_hours_per_week: editFormData.contracted_hours && editFormData.contracted_hours !== '' 
          ? parseFloat(editFormData.contracted_hours) 
          : (editFormData.contracted_hours_per_week && editFormData.contracted_hours_per_week !== '' 
            ? parseFloat(editFormData.contracted_hours_per_week.toString()) 
            : null),
        hourly_rate: editFormData.hourly_rate && editFormData.hourly_rate !== '' 
          ? Math.round(parseFloat(editFormData.hourly_rate) * 100) 
          : null,
        salary: editFormData.salary && editFormData.salary !== '' 
          ? parseFloat(editFormData.salary) 
          : null,
        pay_frequency: editFormData.pay_frequency || 'monthly',
        notice_period_weeks: editFormData.notice_period_weeks && editFormData.notice_period_weeks !== '' 
          ? parseInt(editFormData.notice_period_weeks.toString()) 
          : 1,
        boh_foh: editFormData.boh_foh || 'FOH',
        
        national_insurance_number: toNullIfEmpty(editFormData.national_insurance_number),
        right_to_work_status: editFormData.right_to_work_status || 'pending',
        right_to_work_expiry: toNullIfEmpty(editFormData.right_to_work_expiry),
        right_to_work_document_type: toNullIfEmpty(editFormData.right_to_work_document_type),
        dbs_status: editFormData.dbs_status || 'not_required',
        dbs_certificate_number: toNullIfEmpty(editFormData.dbs_certificate_number),
        dbs_check_date: toNullIfEmpty(editFormData.dbs_check_date),
        
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

      // Log what we're saving (without sensitive data)
      console.log('Saving employee update:', {
        employee_id: editingEmployee.id,
        fields_to_update: Object.keys(updateData),
        updateData: {
          ...updateData,
          bank_account_number: updateData.bank_account_number ? '***' : null,
        }
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingEmployee.id)
        .select();

      if (error) {
        console.error('Error updating employee:', error);
        console.error('Failed update data:', updateData);
        alert(`Failed to update: ${error.message}`);
        return;
      }

      console.log('Employee updated successfully:', data);

      // Refresh employee data
      await fetchEmployee();
      router.refresh();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employeeUpdated', { 
          detail: { employeeId: editingEmployee.id } 
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'pay', label: 'Pay & Tax', icon: CreditCard },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getRoleColor = (role: string | null | undefined) => {
    if (!role) return 'bg-neutral-500/20 text-neutral-400';
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case 'admin': return 'bg-purple-500/20 text-purple-400';
      case 'owner': return 'bg-amber-500/20 text-amber-400';
      case 'manager': return 'bg-blue-500/20 text-blue-400';
      case 'general_manager': return 'bg-blue-500/20 text-blue-400';
      case 'staff': return 'bg-neutral-500/20 text-neutral-400';
      default: return 'bg-neutral-500/20 text-neutral-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'onboarding': return 'bg-amber-500/20 text-amber-400';
      case 'inactive': return 'bg-red-500/20 text-red-400';
      default: return 'bg-neutral-500/20 text-neutral-400';
    }
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  const isInProbation = () => {
    if (!employee?.probation_end_date) return false;
    return new Date(employee.probation_end_date) > new Date();
  };

  const calculateTenure = () => {
    if (!employee?.start_date) return null;
    const start = new Date(employee.start_date);
    const now = new Date();
    const years = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - start.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#EC4899]" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Employee not found</h3>
        <Link
          href="/dashboard/people/employees"
          className="text-[#EC4899] hover:text-[#EC4899]/80"
        >
          Back to employees
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/people/employees"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      {/* Header Card */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
            {employee.avatar_url ? (
              <img 
                src={employee.avatar_url} 
                alt={employee.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(employee.full_name)
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{employee.full_name}</h1>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(employee.app_role)}`}>
                  {employee.app_role}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(employee.status)}`}>
                  {employee.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <p className="text-neutral-400 mb-1">{employee.position_title || 'No title'}</p>
            {employee.department && (
              <p className="text-neutral-500 text-sm">{employee.department}</p>
            )}
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2 text-neutral-400">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${employee.email}`} className="hover:text-white">{employee.email}</a>
              </div>
              {employee.phone_number && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${employee.phone_number}`} className="hover:text-white">{employee.phone_number}</a>
                </div>
              )}
              {employee.sites?.name && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.sites.name}</span>
                </div>
              )}
              {employee.manager?.full_name && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Briefcase className="w-4 h-4" />
                  <span>Reports to: {employee.manager.full_name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions & Alerts */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
            
            {/* Alerts */}
            <div className="flex flex-col gap-2">
              {employee.right_to_work_status === 'expired' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">RTW Expired</span>
                </div>
              )}
              {isExpiringSoon(employee.right_to_work_expiry) && employee.right_to_work_status !== 'expired' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-amber-400">RTW Expiring</span>
                </div>
              )}
              {isInProbation() && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">On Probation</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#EC4899]/20 to-blue-600/20 text-white border border-[#EC4899]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-lg p-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            employee={employee} 
            tenure={calculateTenure()} 
            onUpdate={fetchEmployee} 
            sites={sites}
            onOpenSiteAssignments={(emp) => {
              setSiteAssignmentsEmployee(emp);
              setShowSiteAssignmentsModal(true);
            }}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab employeeId={employee.id} />
        )}
        {activeTab === 'leave' && (
          <div className="text-neutral-400 text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Leave management coming in Phase 2</p>
          </div>
        )}
        {activeTab === 'training' && (
          <TrainingTab employee={employee} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab employeeId={employee.id} />
        )}
        {activeTab === 'pay' && (
          <PayTaxTab employee={employee} onUpdate={fetchEmployee} />
        )}
        {activeTab === 'notes' && (
          <div className="text-neutral-400 text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Notes coming soon</p>
          </div>
        )}
      </div>

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
          onOpenSiteAssignments={(emp) => {
            setSiteAssignmentsEmployee(emp);
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
          companyId={company.id}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ employee, tenure, onUpdate, sites, onOpenSiteAssignments }: { employee: Employee; tenure: string | null; onUpdate: () => void; sites: { id: string; name: string }[]; onOpenSiteAssignments?: (employee: Employee) => void }) {
  const [probationReviews, setProbationReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Debug: Log sites when they change
  useEffect(() => {
    console.log('📍 OverviewTab received sites:', sites.length, sites);
  }, [sites]);

  useEffect(() => {
    const fetchProbationReviews = async () => {
      try {
        setLoadingReviews(true);
        // First get all schedules for this employee
        const { data: allSchedules, error } = await supabase
          .from('employee_review_schedules')
          .select(`
            *,
            template:review_templates (
              id,
              name,
              template_type
            ),
            manager:profiles!employee_review_schedules_manager_id_fkey (
              id,
              full_name
            )
          `)
          .eq('employee_id', employee.id)
          .order('scheduled_date', { ascending: true });

        if (error) {
          console.error('Error fetching probation reviews:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        } else {
          // Filter to only probation reviews
          const probation = (allSchedules || []).filter((schedule: any) => 
            schedule.template?.template_type === 'probation_review'
          );
          setProbationReviews(probation);
        }
      } catch (error: any) {
        console.error('Error fetching probation reviews:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack
        });
      } finally {
        setLoadingReviews(false);
      }
    };

    if (employee?.id) {
      fetchProbationReviews();
    }
  }, [employee?.id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#EC4899]" />
            Personal Information
          </h3>
          <div className="space-y-3">
            <InfoRow label="Date of Birth" value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('en-GB') : 'Not set'} />
            <InfoRow label="Gender" value={employee.gender || 'Not set'} />
            <InfoRow label="Nationality" value={employee.nationality || 'Not set'} />
            <InfoRow label="Phone" value={employee.phone_number || 'Not set'} />
            <InfoRow label="Address" value={
              [employee.address_line_1, employee.city, employee.postcode]
                .filter(Boolean).join(', ') || 'Not set'
            } />
            <InfoRow label="Emergency Contact" value={
              employee.emergency_contacts?.[0]?.name 
                ? `${employee.emergency_contacts[0].name} (${employee.emergency_contacts[0].relationship}) - ${employee.emergency_contacts[0].phone}`
                : 'Not set'
            } />
          </div>
        </div>

        {/* Compliance */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#EC4899]" />
            Compliance
          </h3>
          <div className="space-y-3">
            <InfoRow 
              label="Right to Work" 
              value={employee.right_to_work_status?.replace('_', ' ') || 'Not verified'}
              status={employee.right_to_work_status === 'verified' ? 'success' : employee.right_to_work_status === 'expired' ? 'error' : 'warning'}
              fieldName="right_to_work_status"
              employeeId={employee.id}
              onUpdate={onUpdate}
              type="select"
              options={[
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'expired', label: 'Expired' },
                { value: 'not_verified', label: 'Not Verified' }
              ]}
            />
            <InfoRow 
              label="RTW Expiry" 
              value={employee.right_to_work_expiry ? new Date(employee.right_to_work_expiry).toLocaleDateString('en-GB') : 'No expiry'}
              actualValue={employee.right_to_work_expiry}
              fieldName="right_to_work_expiry"
              employeeId={employee.id}
              onUpdate={onUpdate}
              type="date"
            />
            <InfoRow 
              label="DBS Check" 
              value={employee.dbs_status?.replace('_', ' ') || 'Not checked'}
              status={employee.dbs_status === 'clear' ? 'success' : employee.dbs_status === 'pending' ? 'warning' : undefined}
              fieldName="dbs_status"
              employeeId={employee.id}
              onUpdate={onUpdate}
              type="select"
              options={[
                { value: 'clear', label: 'Clear' },
                { value: 'pending', label: 'Pending' },
                { value: 'not_checked', label: 'Not Checked' }
              ]}
            />
            <InfoRow 
              label="DBS Date" 
              value={employee.dbs_check_date ? new Date(employee.dbs_check_date).toLocaleDateString('en-GB') : 'N/A'}
              actualValue={employee.dbs_check_date}
              fieldName="dbs_check_date"
              employeeId={employee.id}
              onUpdate={onUpdate}
              type="date"
            />
            <InfoRow 
              label="DBS Certificate Number" 
              value={employee.dbs_certificate_number || 'Not set'}
              fieldName="dbs_certificate_number"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
            <InfoRow 
              label="NI Number" 
              value={employee.national_insurance_number || 'Not set'}
              fieldName="national_insurance_number"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Employment Details */}
        <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[#EC4899]" />
          Employment Details
        </h3>
        <div className="space-y-3">
          <InfoRow 
            label="Employee Number" 
            value={employee.employee_number || 'Not set'}
            fieldName="employee_number"
            employeeId={employee.id}
            onUpdate={onUpdate}
          />
          <InfoRow 
            label="Position / Job Title" 
            value={employee.position_title || 'Not set'}
            fieldName="position_title"
            employeeId={employee.id}
            onUpdate={onUpdate}
          />
          <InfoRow 
            label="Department" 
            value={employee.department || 'Not set'}
            fieldName="department"
            employeeId={employee.id}
            onUpdate={onUpdate}
          />
          <InfoRow 
            label="App Role" 
            value={employee.app_role || 'Not set'}
            fieldName="app_role"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'Staff', label: 'Staff' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Admin', label: 'Admin' },
              { value: 'Owner', label: 'Owner' }
            ]}
          />
          <InfoRow 
            label="FOH/BOH" 
            value={employee.boh_foh || 'Not set'}
            fieldName="boh_foh"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'FOH', label: 'FOH' },
              { value: 'BOH', label: 'BOH' },
              { value: 'BOTH', label: 'Both' }
            ]}
          />
          <InfoRow 
            label="Home Site" 
            value={employee.sites?.name || 'Not set'}
            actualValue={employee.home_site || (employee as any).home_site}
            fieldName="home_site"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={sites.map(site => ({ value: site.id, label: site.name }))}
          />
          {onOpenSiteAssignments && (
            <div className="pt-3 border-t border-white/[0.1]">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-300">
                  <strong>Multi-Site Assignment:</strong> Allow this employee to work at other sites
                </p>
              </div>
              <button
                onClick={() => onOpenSiteAssignments(employee)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:shadow-[0_0_12px_rgba(59,130,246,0.7)] rounded-lg transition-all font-medium"
              >
                <MapPin className="w-5 h-5" />
                Manage Site Assignments
              </button>
              <p className="text-xs text-neutral-500 mt-2 text-center">
                Allow this employee to work at other sites during specified date ranges
              </p>
            </div>
          )}
          <InfoRow 
            label="Line Manager" 
            value={employee.manager?.full_name || 'Not set'}
            fieldName="reports_to"
            employeeId={employee.id}
            onUpdate={onUpdate}
          />
          <InfoRow 
            label="Start Date" 
            value={employee.start_date ? new Date(employee.start_date).toLocaleDateString('en-GB') : 'Not set'}
            actualValue={employee.start_date}
            fieldName="start_date"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="date"
          />
          <InfoRow label="Tenure" value={tenure || 'N/A'} />
          <InfoRow 
            label="Contract Type" 
            value={employee.contract_type?.replace('_', ' ') || 'Not set'}
            fieldName="contract_type"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'casual', label: 'Casual' },
              { value: 'contract', label: 'Contract' },
              { value: 'temporary', label: 'Temporary' }
            ]}
          />
          <InfoRow 
            label="Contracted Hours" 
            value={employee.contracted_hours ? `${employee.contracted_hours} hrs/week` : 'Not set'}
            fieldName="contracted_hours_per_week"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
          <InfoRow 
            label="Pay Frequency" 
            value={employee.pay_frequency || 'Not set'}
            fieldName="pay_frequency"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi_weekly', label: 'Bi-Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' }
            ]}
          />
          <InfoRow 
            label="Probation End" 
            value={employee.probation_end_date ? new Date(employee.probation_end_date).toLocaleDateString('en-GB') : 'N/A'}
            actualValue={employee.probation_end_date}
            fieldName="probation_end_date"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="date"
          />
          <InfoRow 
            label="Notice Period" 
            value={employee.notice_period_weeks ? `${employee.notice_period_weeks} weeks` : 'Not set'}
            fieldName="notice_period_weeks"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
        </div>
        </div>

        {/* Banking */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#EC4899]" />
            Bank Details
          </h3>
          <div className="space-y-3">
            <InfoRow 
              label="Bank" 
              value={employee.bank_name || 'Not set'}
              fieldName="bank_name"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
            <InfoRow 
              label="Account Name" 
              value={employee.bank_account_name || 'Not set'}
              fieldName="bank_account_name"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
            <InfoRow 
              label="Sort Code" 
              value={employee.bank_sort_code || 'Not set'}
              fieldName="bank_sort_code"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
            <InfoRow 
              label="Account Number" 
              value={employee.bank_account_number ? '••••••••' : 'Not set'}
              fieldName="bank_account_number"
              employeeId={employee.id}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </div>

      {/* Probation Reviews - Full Width */}
      <div className="md:col-span-2">
        <ProbationReviewsSection employeeId={employee.id} startDate={employee.start_date} />
      </div>
    </div>
  );
}

// Probation Reviews Section Component
function ProbationReviewsSection({ employeeId, startDate }: { employeeId: string; startDate: string | null }) {
  const [probationReviews, setProbationReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchProbationReviews = async () => {
      try {
        setLoadingReviews(true);
        // First get all schedules for this employee
        const { data: allSchedules, error } = await supabase
          .from('employee_review_schedules')
          .select(`
            *,
            template:review_templates (
              id,
              name,
              template_type
            ),
            manager:profiles!employee_review_schedules_manager_id_fkey (
              id,
              full_name
            )
          `)
          .eq('employee_id', employeeId)
          .order('scheduled_date', { ascending: true });

        if (error) {
          console.error('Error fetching probation reviews:', error);
        } else {
          // Filter to only probation reviews
          const probation = (allSchedules || []).filter((schedule: any) => 
            schedule.template?.template_type === 'probation_review'
          );
          setProbationReviews(probation);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (employeeId) {
      fetchProbationReviews();
    }
  }, [employeeId]);

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-[#EC4899]" />
        Probation Reviews
      </h3>
      <div className="space-y-3">
        {loadingReviews ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          </div>
        ) : probationReviews.length === 0 ? (
          <div className="text-sm text-neutral-400 py-2">
            {startDate 
              ? 'No probation review scheduled yet'
              : 'Set start date to auto-schedule probation review'}
          </div>
        ) : (
          probationReviews.map((schedule: any) => {
            const scheduledDate = schedule.scheduled_date 
              ? new Date(schedule.scheduled_date).toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })
              : 'Not scheduled';
            
            const daysUntil = schedule.scheduled_date 
              ? Math.ceil((new Date(schedule.scheduled_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : null;

            const statusColors: Record<string, string> = {
              scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
              invitation_sent: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
              in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
              pending_manager: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
              pending_employee: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
              completed: 'bg-green-500/10 text-green-400 border-green-500/30',
              cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
            };

            return (
              <div 
                key={schedule.id}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">
                        {schedule.template?.name || 'Probation Review'}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[schedule.status] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30'}`}>
                        {schedule.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled: {scheduledDate}</span>
                        {daysUntil !== null && (
                          <span className={daysUntil < 0 ? 'text-red-400' : daysUntil <= 7 ? 'text-yellow-400' : 'text-neutral-500'}>
                            ({daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Today' : `${daysUntil} days away`})
                          </span>
                        )}
                      </div>
                      {schedule.manager?.full_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>Manager: {schedule.manager.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {schedule.review_id ? (
                    <Link
                      href={`/dashboard/people/reviews/${schedule.review_id}`}
                      className="ml-4 px-3 py-1.5 bg-transparent border border-[#EC4899] text-[#EC4899] rounded text-sm hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all"
                    >
                      View Review
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/people/reviews/schedule`}
                      className="ml-4 px-3 py-1.5 bg-transparent border border-[#EC4899] text-[#EC4899] rounded text-sm hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all"
                    >
                      Start Review
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  actualValue,
  status,
  fieldName,
  employeeId,
  onUpdate,
  type = 'text',
  options
}: { 
  label: string; 
  value: string; 
  actualValue?: unknown;
  status?: 'success' | 'warning' | 'error';
  fieldName?: string;
  employeeId?: string;
  onUpdate?: () => void;
  type?: 'text' | 'date' | 'number' | 'select' | 'boolean' | 'textarea';
  options?: { value: string; label: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  const originalEditValue = useMemo(() => {
    const isPlaceholder = (v: unknown) =>
      v === null ||
      v === undefined ||
      v === '' ||
      v === 'Not set' ||
      v === 'N/A' ||
      v === 'No expiry';

    const toIsoDate = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (!s) return null;

      // Already ISO date or datetime
      const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoMatch) return isoMatch[1];

      // en-GB formatted date: DD/MM/YYYY (browser parsing is unreliable)
      const gbMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (gbMatch) {
        const dd = gbMatch[1].padStart(2, '0');
        const mm = gbMatch[2].padStart(2, '0');
        const yyyy = gbMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }

      // Best-effort fallback for other formats
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      return null;
    };

    const toNumberString = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      const s = String(v);
      const cleaned = s.replace(/[^0-9.-]/g, '');
      const n = cleaned ? Number.parseFloat(cleaned) : NaN;
      return Number.isFinite(n) ? String(n) : '';
    };

    if (type === 'date') {
      if (!isPlaceholder(actualValue)) {
        const iso = toIsoDate(actualValue);
        return iso || '';
      }
      if (isPlaceholder(value)) return '';
      const iso = toIsoDate(value);
      return iso || '';
    }

    if (type === 'number') {
      if (!isPlaceholder(actualValue)) return toNumberString(actualValue);
      if (isPlaceholder(value)) return '';
      return toNumberString(value);
    }

    if (type === 'boolean') {
      if (typeof actualValue === 'boolean') return actualValue ? 'true' : 'false';
      if (value === 'Yes') return 'true';
      if (value === 'No') return 'false';
      if (value === 'true' || value === 'false') return value;
      return '';
    }

    if (type === 'select' && options) {
      const actual = actualValue === null || actualValue === undefined ? '' : String(actualValue);
      if (actual && options.some((o) => o.value === actual)) return actual;

      const labelStr = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
      const matched = options.find(
        (o) => o.value === value || o.label.trim().toLowerCase() === labelStr
      );
      return matched?.value || '';
    }

    return isPlaceholder(value) ? '' : value;
  }, [type, value, actualValue, options]);

  const [editValue, setEditValue] = useState(originalEditValue);

  // Keep edit state in sync when the backing value changes (e.g. after refresh)
  useEffect(() => {
    if (!isEditing) setEditValue(originalEditValue);
  }, [originalEditValue, isEditing]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fieldName || !employeeId || editValue === originalEditValue) {
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
        // For select fields, preserve empty string as null, but don't clear if value is actually selected
        // If editValue is empty string and field is home_site or reports_to (UUID fields), set to null
        if (editValue === '' && (fieldName === 'home_site' || fieldName === 'reports_to')) {
          updateData[fieldName] = null;
        } else if (editValue === '') {
          updateData[fieldName] = null;
        } else {
          updateData[fieldName] = editValue;
        }
      } else {
        updateData[fieldName] = editValue || null;
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
    setEditValue(originalEditValue);
    setIsEditing(false);
  };

  if (!fieldName || !employeeId) {
    // Non-editable row - but maintain alignment with editable rows
    return (
      <div className="flex justify-between items-center py-2 border-b border-neutral-700 group">
        <span className="text-neutral-400">{label}</span>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className={`text-right ${
            status === 'success' ? 'text-green-400' :
            status === 'warning' ? 'text-amber-400' :
            status === 'error' ? 'text-red-400' :
            'text-white'
          }`}>
            {value}
          </span>
          {/* Placeholder for edit button to maintain alignment - matches exact button structure */}
          <button
            disabled
            className="opacity-0 px-2 py-1 pointer-events-none"
            aria-hidden="true"
            tabIndex={-1}
            style={{ visibility: 'hidden' }}
          >
            <Edit className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-neutral-700 group">
      <span className="text-neutral-400">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {isEditing ? (
          <>
            {type === 'select' && options ? (
              <select
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
                autoFocus
                disabled={options.length === 0}
              >
                <option value="">Not set</option>
                {options.length > 0 ? (
                  options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))
                ) : (
                  <option value="" disabled>Loading options...</option>
                )}
              </select>
            ) : type === 'boolean' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
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
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
                autoFocus
              />
            ) : type === 'number' ? (
              <input
                type="number"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
                autoFocus
              />
            ) : type === 'textarea' ? (
              <textarea
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
                rows={2}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 max-w-xs px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded text-white text-sm"
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
            <span className={`text-right ${
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

// Training Tab
function TrainingTab({ employee }: { employee: Employee }) {
  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry > new Date();
  };

  const certifications = [
    {
      name: 'Food Safety',
      level: employee.food_safety_level,
      expiry: employee.food_safety_expiry_date,
    },
    {
      name: 'Health & Safety',
      level: employee.h_and_s_level,
      expiry: employee.h_and_s_expiry_date,
    },
    {
      name: 'Fire Marshal',
      trained: employee.fire_marshal_trained,
      expiry: employee.fire_marshal_expiry_date,
    },
    {
      name: 'First Aid',
      trained: employee.first_aid_trained,
      expiry: employee.first_aid_expiry_date,
    },
    {
      name: 'COSSH',
      trained: employee.cossh_trained,
      expiry: employee.cossh_expiry_date,
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-[#EC4899]" />
        Training Certifications
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {certifications.map((cert) => {
          const expired = isExpired(cert.expiry);
          const expiringSoon = isExpiringSoon(cert.expiry);
          const isValid = cert.level ? cert.level > 0 : cert.trained;
          
          return (
            <div
              key={cert.name}
              className={`p-4 rounded-lg border ${
                expired ? 'bg-red-500/10 border-red-500/50' :
                expiringSoon ? 'bg-amber-500/10 border-amber-500/50' :
                isValid ? 'bg-green-500/10 border-green-500/50' :
                'bg-neutral-700/50 border-neutral-600'
              }`}
            >
              <h4 className="font-medium text-white mb-2">{cert.name}</h4>
              <div className="space-y-1 text-sm">
                {'level' in cert && cert.level !== undefined && (
                  <p className="text-neutral-400">
                    Level: <span className="text-white">{cert.level || 'Not trained'}</span>
                  </p>
                )}
                {'trained' in cert && cert.trained !== undefined && (
                  <p className="text-neutral-400">
                    Status: <span className={cert.trained ? 'text-green-400' : 'text-neutral-500'}>
                      {cert.trained ? 'Trained' : 'Not trained'}
                    </span>
                  </p>
                )}
                {cert.expiry && (
                  <p className={`${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-neutral-400'}`}>
                    {expired ? 'Expired: ' : expiringSoon ? 'Expiring: ' : 'Expires: '}
                    {new Date(cert.expiry).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Documents Tab (Placeholder - will be expanded)
function DocumentsTab({ employeeId }: { employeeId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>('proof_of_id');
  const [title, setTitle] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const { profile: currentUser, companyId } = useAppContext();

  // Onboarding packs (role-based)
  const [bohFoh, setBohFoh] = useState<'FOH' | 'BOH' | 'BOTH'>('FOH');
  const [payType, setPayType] = useState<'hourly' | 'salaried'>('hourly');
  const [packs, setPacks] = useState<any[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [packDocs, setPackDocs] = useState<any[]>([]);
  const [globalDocs, setGlobalDocs] = useState<any[]>([]);
  const [creatingPack, setCreatingPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackDocIds, setNewPackDocIds] = useState<Set<string>>(new Set());
  const [sendingPack, setSendingPack] = useState(false);

  const REQUIRED_DOCS: { key: string; label: string; required: boolean; help?: string }[] = [
    // Hiring / legal (UK defaults – can be made configurable per company later)
    { key: 'proof_of_id', label: 'Proof of ID', required: true, help: 'Passport / driving licence' },
    { key: 'right_to_work', label: 'Right to Work', required: true, help: 'Share code / visa / BRP' },
    { key: 'proof_of_address', label: 'Proof of address', required: false, help: 'Utility bill, etc.' },
    { key: 'employment_contract', label: 'Employment contract', required: true },
    { key: 'starter_declaration', label: 'Starter declaration (P46)', required: false },
    { key: 'p45', label: 'P45', required: false },
    // Role-specific / conditional
    { key: 'dbs_certificate', label: 'DBS certificate', required: false, help: 'If role requires DBS' },
    // Training evidence
    { key: 'food_safety_certificate', label: 'Food Safety certificate', required: false },
    { key: 'health_safety_certificate', label: 'Health & Safety certificate', required: false },
    { key: 'fire_marshal_certificate', label: 'Fire Marshal certificate', required: false },
    { key: 'first_aid_certificate', label: 'First Aid certificate', required: false },
    // Other
    { key: 'other', label: 'Other', required: false },
  ];

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  // Load company global docs & packs
  useEffect(() => {
    if (!companyId) return;
    void fetchGlobalDocs();
    void fetchPacks();
     
  }, [companyId, bohFoh, payType]);

  useEffect(() => {
    if (!selectedPackId) {
      setPackDocs([]);
      return;
    }
    void fetchPackDocs(selectedPackId);
     
  }, [selectedPackId]);

  const fetchDocuments = async () => {
    setErrorMsg(null);
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('profile_id', employeeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading employee documents:', error);
      // Helpful hint when table/bucket hasn't been migrated yet
      if (
        String(error.message || '').toLowerCase().includes('employee_documents') ||
        String((error as any).code || '').toLowerCase().includes('42p01')
      ) {
        setErrorMsg(
          "Employee documents aren't set up in the database yet. Apply the migration `20251215081025_create_employee_documents.sql` (and storage policies) then refresh."
        );
      } else {
        setErrorMsg(error.message || 'Failed to load documents');
      }
      setDocuments([]);
      setLoading(false);
      return;
    }

    setDocuments(data || []);
    setLoading(false);
  };

  const fetchGlobalDocs = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('global_documents')
      .select('id,name,category,version,file_path,created_at,is_archived')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load global_documents:', error);
      setGlobalDocs([]);
      return;
    }
    // Default: only active docs
    setGlobalDocs((data || []).filter((d: any) => !d.is_archived));
  };

  const fetchPacks = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from('company_onboarding_packs')
      .select('id,name,boh_foh,pay_type,is_active')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .in('boh_foh', bohFoh === 'BOTH' ? ['BOTH'] : [bohFoh, 'BOTH'])
      .eq('pay_type', payType)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load packs:', error);
      setPacks([]);
      return;
    }
    setPacks(data || []);
    // Keep selection if still present
    const stillThere = (data || []).some((p: any) => p.id === selectedPackId);
    if (!stillThere) {
      setSelectedPackId((data?.[0]?.id as string) || '');
    }
  };

  const fetchPackDocs = async (packId: string) => {
    const { data, error } = await supabase
      .from('company_onboarding_pack_documents')
      .select('id,pack_id,global_document_id,sort_order,required,global_documents:global_document_id(id,name,category,version,file_path)')
      .eq('pack_id', packId)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('Failed to load pack docs:', error);
      setPackDocs([]);
      return [];
    }
    setPackDocs(data || []);
    return data || [];
  };

  const applySuggestedPackSelection = () => {
    // Heuristic: match global docs by name keywords. This makes the builder feel guided
    // even when companies have their own naming conventions.
    const baseKeywords = [
      'handbook',
      'health & safety',
      'health and safety',
      'h&s',
      'fire safety',
      'allergen',
      'data protection',
      'gdpr',
      'disciplinary',
      'grievance',
      'equal opportunities',
      'safeguarding',
    ];
    const bohKeywords = ['food safety', 'haccp', 'coshh', 'cleaning', 'temperature', 'pest'];
    const fohKeywords = ['service', 'customer', 'cash', 'till', 'alcohol', 'licensing', 'challenge 25'];
    const hourlyKeywords = ['time', 'clock', 'rota', 'lateness', 'absence'];
    const salariedKeywords = ['performance', 'management', 'expenses', 'bonus'];
    const contractKeywords = ['offer', 'employment contract', 'contract'];

    const keywords: string[] = [...baseKeywords, ...contractKeywords];
    if (bohFoh === 'BOH') keywords.push(...bohKeywords);
    if (bohFoh === 'FOH') keywords.push(...fohKeywords);
    if (bohFoh === 'BOTH') keywords.push(...bohKeywords, ...fohKeywords);
    if (payType === 'hourly') keywords.push(...hourlyKeywords);
    if (payType === 'salaried') keywords.push(...salariedKeywords);

    const normalize = (s: string) => s.toLowerCase();
    const selected = new Set<string>();
    globalDocs.forEach((d: any) => {
      const name = normalize(d?.name || '');
      if (!name) return;
      if (keywords.some((k) => name.includes(k))) selected.add(d.id);
    });

    if (selected.size === 0) {
      alert(
        "No obvious matches found in your Global Documents. Tip: name docs like 'Staff Handbook', 'Health & Safety Policy', 'Employment Contract', etc. and try again."
      );
      return;
    }

    setNewPackDocIds(selected);
  };

  const toggleNewPackDoc = (docId: string) => {
    setNewPackDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const createPack = async () => {
    if (!companyId || !currentUser?.id) return;
    const name = newPackName.trim();
    if (!name) {
      alert('Please name the pack');
      return;
    }
    if (newPackDocIds.size === 0) {
      alert('Please select at least one document');
      return;
    }

    try {
      const { data: pack, error: packErr } = await supabase
        .from('company_onboarding_packs')
        .insert({
          company_id: companyId,
          name,
          boh_foh: bohFoh,
          pay_type: payType,
          created_by: currentUser.id,
        })
        .select('id')
        .single();
      if (packErr) throw packErr;

      const rows = Array.from(newPackDocIds).map((docId, idx) => ({
        pack_id: pack.id,
        global_document_id: docId,
        sort_order: idx,
        required: true,
      }));
      const { error: linkErr } = await supabase.from('company_onboarding_pack_documents').insert(rows);
      if (linkErr) throw linkErr;

      setCreatingPack(false);
      setNewPackName('');
      setNewPackDocIds(new Set());
      await fetchPacks();
      setSelectedPackId(pack.id);
    } catch (e: any) {
      console.error('Create pack failed:', e);
      alert(`Create pack failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const sendPack = async () => {
    if (!companyId || !currentUser?.id) return;
    const packId = selectedPackId;
    if (!packId) {
      alert('Select a pack first');
      return;
    }

    // We need employee email. We can fetch it from profiles.
    setSendingPack(true);
    try {
      const { data: emp, error: empErr } = await supabase
        .from('profiles')
        .select('id,email,full_name')
        .eq('id', employeeId)
        .single();
      if (empErr) throw empErr;
      if (!emp?.email) {
        alert('Employee has no email set');
        return;
      }

      // Create assignment
      const { data: assignment, error: assignErr } = await supabase
        .from('employee_onboarding_assignments')
        .insert({
          company_id: companyId,
          profile_id: employeeId,
          pack_id: packId,
          sent_by: currentUser.id,
          message: null,
        })
        .select('id')
        .single();
      if (assignErr) throw assignErr;

      // Load docs for email (do not rely on React state timing)
      const docsForEmail = await fetchPackDocs(packId);
      const docLines = docsForEmail
        .map((d: any) => `• ${d.global_documents?.name || 'Document'}`)
        .join('\n');

      const subject = 'Your onboarding documents';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const link = `${appUrl}/dashboard/people/onboarding`;
      const body = `Hi ${emp.full_name || ''}\n\nPlease review the following onboarding documents:\n${docLines}\n\nYou can review and acknowledge them here:\n${link}\n\nThanks`;

      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emp.email, subject, body }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Email failed');

      alert('Onboarding pack sent');
    } catch (e: any) {
      console.error('Send pack failed:', e);
      alert(`Send pack failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setSendingPack(false);
    }
  };

  const safeName = (name: string) =>
    name
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

  const handleUpload = async () => {
    if (!companyId) {
      alert('Missing company context');
      return;
    }
    if (!currentUser?.id) {
      alert('Missing user context');
      return;
    }
    if (!file) {
      alert('Please choose a file');
      return;
    }

    setUploading(true);
    try {
      const finalTitle = (title || file.name).trim();
      const uuid =
        (globalThis.crypto as any)?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const objectName = `${companyId}/${employeeId}/${docType}/${uuid}_${safeName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(objectName, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('employee_documents').insert({
        company_id: companyId,
        profile_id: employeeId,
        document_type: docType,
        title: finalTitle,
        bucket_id: 'employee-documents',
        file_path: objectName,
        mime_type: file.type || null,
        file_size: file.size || null,
        expires_at: expiresAt || null,
        notes: notes || null,
        uploaded_by: currentUser.id,
      });

      if (insertError) throw insertError;

      setUploadOpen(false);
      setTitle('');
      setExpiresAt('');
      setNotes('');
      setFile(null);
      await fetchDocuments();
    } catch (e: any) {
      console.error('Upload failed:', e);
      alert(`Upload failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const bucket = doc.bucket_id || 'employee-documents';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(doc.file_path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      console.error('Download failed:', e);
      alert(`Download failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (doc: any) => {
    if (!currentUser?.id) return;
    const ok = confirm(`Delete "${doc.title}"?`);
    if (!ok) return;

    try {
      // Soft delete record
      const { error: delErr } = await supabase
        .from('employee_documents')
        .update({ deleted_at: new Date().toISOString(), deleted_by: currentUser.id })
        .eq('id', doc.id);
      if (delErr) throw delErr;

      // Best-effort storage cleanup
      await supabase.storage.from(doc.bucket_id || 'employee-documents').remove([doc.file_path]);

      await fetchDocuments();
    } catch (e: any) {
      console.error('Delete failed:', e);
      alert(`Delete failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const uploadedByType = new Map<string, any[]>();
  documents.forEach((d) => {
    const k = d.document_type || 'other';
    uploadedByType.set(k, [...(uploadedByType.get(k) || []), d]);
  });

  if (loading) {
    return <div className="text-neutral-400">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Documents</h3>
        <button
          onClick={() => setUploadOpen(true)}
          className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Required docs checklist */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Required employee documents</h4>
            <p className="text-xs text-white/60">Checklist (can be configured per role later)</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">
              {REQUIRED_DOCS.filter((d) => d.required && (uploadedByType.get(d.key)?.length || 0) > 0).length}
            </div>
            <div className="text-xs text-white/60">of {REQUIRED_DOCS.filter((d) => d.required).length}</div>
          </div>
        </div>

        <div className="space-y-2">
          {REQUIRED_DOCS.filter((d) => d.required).map((d) => {
            const has = (uploadedByType.get(d.key)?.length || 0) > 0;
            return (
              <div
                key={d.key}
                className={`flex items-center gap-2 text-xs p-2 rounded ${
                  has ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/[0.03] border border-white/[0.1]'
                }`}
              >
                <span className={has ? 'text-green-400' : 'text-red-400'}>{has ? '✓' : '○'}</span>
                <span className={`flex-1 ${has ? 'text-white/80' : 'text-white/60'}`}>{d.label}</span>
                {d.help && <span className="text-white/40">{d.help}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-400 mb-4">No documents uploaded yet</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-white">{doc.title}</p>
                  <p className="text-sm text-neutral-400">
                    {doc.document_type}
                    {doc.expires_at ? ` · expires ${new Date(doc.expires_at).toLocaleDateString('en-GB')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-sm text-[#EC4899] hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-neutral-900 border border-white/[0.1] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-semibold">Upload document</h4>
              <button
                onClick={() => setUploadOpen(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">Document type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                >
                  {REQUIRED_DOCS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Passport, Contract v1"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Expiry date (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">File</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-white"
                />
                <p className="text-xs text-white/40 mt-1">PDF, images, Word. Stored privately.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setUploadOpen(false)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-[#EC4899] text-white rounded-lg disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding pack sending */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Send onboarding pack</h4>
            <p className="text-xs text-white/60">Role-based: filter by BOH/FOH and hourly/salaried</p>
          </div>
          <button
            onClick={sendPack}
            disabled={sendingPack || !selectedPackId}
            className="px-4 py-2 bg-[#EC4899] text-white rounded-lg disabled:opacity-50"
          >
            {sendingPack ? 'Sending…' : 'Send pack'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs text-white/70 mb-1">BOH/FOH</label>
            <select
              value={bohFoh}
              onChange={(e) => setBohFoh(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="FOH">FOH</option>
              <option value="BOH">BOH</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Pay type</label>
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="hourly">Hourly</option>
              <option value="salaried">Salaried</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Pack</label>
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              {packs.length === 0 ? (
                <option value="">No packs found</option>
              ) : (
                packs.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-4">
          {packs.length === 0 ? (
            <div className="text-sm text-white/70">
              No packs exist for these filters.{' '}
              <button className="text-[#EC4899] hover:underline" onClick={() => setCreatingPack(true)}>
                Create one
              </button>
              .
            </div>
          ) : (
            <div className="text-xs text-white/60">
              {packDocs.length ? `${packDocs.length} document(s) in this pack.` : 'Select a pack to preview documents.'}
            </div>
          )}
        </div>

        {packDocs.length > 0 && (
          <div className="mt-3 space-y-2">
            {packDocs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded bg-white/[0.03] border border-white/[0.06]">
                <div className="text-white/80">{d.global_documents?.name || 'Document'}</div>
                <div className="text-white/40">{d.global_documents?.category || ''}</div>
              </div>
            ))}
          </div>
        )}

        {creatingPack && (
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-white font-semibold text-sm">Create pack</h5>
              <button
                onClick={() => setCreatingPack(false)}
                className="text-white/60 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Pack name</label>
                <input
                  value={newPackName}
                  onChange={(e) => setNewPackName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                  placeholder="e.g. FOH Hourly Starter Pack"
                />
                <p className="text-xs text-white/40 mt-1">Saved with current filters: {bohFoh} / {payType}</p>
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={createPack}
                  className="px-4 py-2 bg-[#EC4899] text-white rounded-lg"
                >
                  Save pack
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs text-white/60">Select global documents to include:</div>
                <button
                  onClick={applySuggestedPackSelection}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                  type="button"
                >
                  Use suggested pack
                </button>
              </div>
              <div className="max-h-56 overflow-auto space-y-1">
                {globalDocs.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-white/80 p-2 rounded bg-white/[0.02] border border-white/[0.06]">
                    <input
                      type="checkbox"
                      checked={newPackDocIds.has(d.id)}
                      onChange={() => toggleNewPackDoc(d.id)}
                    />
                    <span className="flex-1">{d.name}</span>
                    <span className="text-white/40 text-xs">{d.category || ''}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Pay & Tax Tab
function PayTaxTab({ employee, onUpdate }: { employee: Employee; onUpdate: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pay Details */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#EC4899]" />
          Pay Details
        </h3>
        <div className="space-y-3">
          <InfoRow 
            label="Hourly Rate" 
            value={employee.hourly_rate ? (employee.hourly_rate / 100).toFixed(2) : 'Not set'}
            fieldName="hourly_rate"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
          <InfoRow 
            label="Salary" 
            value={employee.salary ? `£${employee.salary.toLocaleString()}` : 'Not set'}
            fieldName="salary"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
          <InfoRow 
            label="Pay Frequency" 
            value={employee.pay_frequency?.replace('_', ' ') || 'Not set'}
            fieldName="pay_frequency"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi_weekly', label: 'Bi-Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'annual', label: 'Annual' }
            ]}
          />
          <InfoRow 
            label="Contracted Hours" 
            value={employee.contracted_hours ? `${employee.contracted_hours} hrs/week` : 'Not set'}
            fieldName="contracted_hours_per_week"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
        </div>
      </div>

      {/* Tax & Deductions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#EC4899]" />
          Tax & Deductions
        </h3>
        <div className="space-y-3">
          <InfoRow 
            label="Tax Code" 
            value={employee.tax_code || 'Not set'}
            fieldName="tax_code"
            employeeId={employee.id}
            onUpdate={onUpdate}
          />
          <InfoRow 
            label="Student Loan" 
            value={employee.student_loan === true ? 'Yes' : employee.student_loan === false ? 'No' : 'Not set'}
            fieldName="student_loan"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="boolean"
          />
          <InfoRow 
            label="Student Loan Plan" 
            value={employee.student_loan_plan || 'Not set'}
            fieldName="student_loan_plan"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="select"
            options={[
              { value: 'plan_1', label: 'Plan 1' },
              { value: 'plan_2', label: 'Plan 2' },
              { value: 'plan_4', label: 'Plan 4' },
              { value: 'plan_5', label: 'Plan 5' }
            ]}
          />
          <InfoRow 
            label="Pension Enrolled" 
            value={employee.pension_enrolled === true ? 'Yes' : employee.pension_enrolled === false ? 'No' : 'Not set'}
            fieldName="pension_enrolled"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="boolean"
          />
          <InfoRow 
            label="Pension Contribution %" 
            value={employee.pension_contribution_percent ? `${employee.pension_contribution_percent}%` : 'Not set'}
            fieldName="pension_contribution_percent"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="number"
          />
          <InfoRow 
            label="P45 Received" 
            value={employee.p45_received === true ? 'Yes' : employee.p45_received === false ? 'No' : 'Not set'}
            fieldName="p45_received"
            employeeId={employee.id}
            onUpdate={onUpdate}
            type="boolean"
          />
        </div>
      </div>
    </div>
  );
}

// Attendance Tab
function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, [employeeId]);

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from('staff_attendance')
      .select(`
        *,
        sites:site_id(name)
      `)
      .eq('profile_id', employeeId)
      .order('clock_in_time', { ascending: false })
      .limit(20);

    if (!error) {
      setAttendance(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-neutral-400">Loading attendance...</div>;
  }

  if (attendance.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <p className="text-neutral-400">No attendance records yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Recent Attendance</h3>
      <div className="space-y-2">
        {attendance.map((record) => (
          <div key={record.id} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
            <div>
              <p className="text-white">
                {new Date(record.clock_in_time).toLocaleDateString('en-GB', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </p>
              <p className="text-sm text-neutral-400">
                {record.sites?.name || 'Unknown site'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white">
                {new Date(record.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {record.clock_out_time 
                  ? new Date(record.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : 'On shift'
                }
              </p>
              {record.total_hours && (
                <p className="text-sm text-neutral-400">{record.total_hours.toFixed(1)} hours</p>
              )}
            </div>
          </div>
        ))}
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
  saving,
  onOpenSiteAssignments,
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
  onOpenSiteAssignments?: (employee: Employee) => void;
}) {
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'compliance' | 'banking' | 'leave' | 'pay' | 'training'>('personal');

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
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
            { id: 'pay', label: 'Pay & Tax', icon: CreditCardIcon },
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
                    {sites && sites.length > 0 ? (
                      sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading sites...</option>
                    )}
                  </select>
                </div>

                {onOpenSiteAssignments && (
                  <div className="md:col-span-2 pt-4 border-t border-neutral-700">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-300">
                        <strong>Multi-Site Assignment:</strong> Allow this employee to work at other sites
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenSiteAssignments(employee)}
                      type="button"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:shadow-[0_0_12px_rgba(59,130,246,0.7)] rounded-lg transition-all font-medium"
                    >
                      <MapPin className="w-5 h-5" />
                      Manage Site Assignments
                    </button>
                    <p className="text-xs text-neutral-500 mt-2 text-center">
                      Allow this employee to work at other sites during specified date ranges
                    </p>
                  </div>
                )}
                
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
                <CreditCardIcon className="w-5 h-5 text-[#EC4899]" />
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
                      onChange={handleChange}
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
                      onChange={handleChange}
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
                      onChange={handleChange}
                      className="w-4 h-4 text-[#EC4899] bg-neutral-700 border-neutral-600 rounded focus:ring-[#EC4899]"
                    />
                    <span className="text-sm text-neutral-300">P45 received</span>
                  </div>
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
                    <option value="">Not certified</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
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
                    Health & Safety Level
                  </label>
                  <select
                    name="h_and_s_level"
                    value={formData.h_and_s_level || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-[#EC4899] focus:border-transparent"
                  >
                    <option value="">Not certified</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">
                    Health & Safety Expiry Date
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
                      onChange={handleChange}
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
                      onChange={handleChange}
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
                      onChange={handleChange}
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
