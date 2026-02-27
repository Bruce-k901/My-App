'use client';

import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Trash2,
  Plus,
  CheckCircle2,
  CalendarCheck
} from '@/components/ui/icons';
import type { EmergencyContact, EmployeeProfile, SiteOption, ManagerOption } from '@/types/employee';
import { InfoRow } from '@/components/people/InfoRow';
import { EditEmployeeModal } from '@/components/people/EditEmployeeModal';
import { buildProfileUpdateData, mapProfileToFormData, generateNextEmployeeNumber } from '@/lib/people/employee-save';
import EmployeeSiteAssignmentsModal from '@/components/people/EmployeeSiteAssignmentsModal';
import { EmployeeTrainingTab } from '@/components/training/EmployeeTrainingTab';
import { toast } from 'sonner';

type TabType = 'overview' | 'documents' | 'leave' | 'training' | 'attendance' | 'notes' | 'pay';

type Employee = EmployeeProfile;

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
  // Skip refresh when a modal/dialog is open (file picker causes blur/focus cycle)
  const modalOpenRef = useRef(false);

  useEffect(() => {
    const handleFocus = () => {
      if (employeeId && !modalOpenRef.current) {
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
        const mappedData = mapProfileToFormData(profileData);

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
      // Auto-generate employee number if blank
      let employeeNumber = editFormData.employee_number;
      if (!employeeNumber || employeeNumber.trim() === '') {
        const generated = await generateNextEmployeeNumber(
          supabase,
          currentUser?.company_id || '',
          company?.name || '',
        );
        if (generated) {
          employeeNumber = generated;
          setEditFormData({ ...editFormData, employee_number: generated });
        }
      }

      const updateData = buildProfileUpdateData(editFormData, emergencyContacts, employeeNumber);

      // Log what we're saving (without sensitive data)
      console.log('Saving employee update:', {
        employee_id: editingEmployee.id,
        fields_to_update: Object.keys(updateData),
        updateData: {
          ...updateData,
          bank_account_number: updateData.bank_account_number ? '***' : null,
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
        console.error('Failed update data:', updateData);
        alert(`Failed to update: ${resJson.error}`);
        return;
      }

      console.log('Employee updated successfully:', resJson.data);

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
    if (!role) return 'bg-neutral-500/20 text-theme-tertiary';
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case 'admin': return 'bg-purple-500/20 text-purple-400';
      case 'owner': return 'bg-amber-500/20 text-amber-400';
      case 'manager': return 'bg-blue-500/20 text-blue-400';
      case 'general_manager': return 'bg-blue-500/20 text-blue-400';
      case 'staff': return 'bg-neutral-500/20 text-theme-tertiary';
      default: return 'bg-neutral-500/20 text-theme-tertiary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'onboarding': return 'bg-amber-500/20 text-amber-400';
      case 'inactive': return 'bg-red-500/20 text-red-400';
      default: return 'bg-neutral-500/20 text-theme-tertiary';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-theme-primary mb-2">Employee not found</h3>
        <Link
          href="/dashboard/people/employees"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
        className="inline-flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Employees
      </Link>

      {/* Header Card */}
 <div className="bg-theme-surface ] border border-theme rounded-lg p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-500 dark:to-blue-600 flex items-center justify-center text-theme-primary text-2xl font-semibold flex-shrink-0">
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
              <h1 className="text-2xl font-bold text-theme-primary">{employee.full_name}</h1>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(employee.app_role)}`}>
                  {employee.app_role}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(employee.status)}`}>
                  {employee.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <p className="text-theme-secondary mb-1">{employee.position_title || 'No title'}</p>
            {employee.department && (
              <p className="text-theme-tertiary text-sm">{employee.department}</p>
            )}
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2 text-theme-secondary">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${employee.email}`} className="hover:text-theme-primary">{employee.email}</a>
              </div>
              {employee.phone_number && (
                <div className="flex items-center gap-2 text-theme-secondary">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${employee.phone_number}`} className="hover:text-theme-primary">{employee.phone_number}</a>
                </div>
              )}
              {employee.sites?.name && (
                <div className="flex items-center gap-2 text-theme-secondary">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.sites.name}</span>
                </div>
              )}
              {employee.manager?.full_name && (
                <div className="flex items-center gap-2 text-theme-secondary">
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
              className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow dark:hover:shadow-module-glow rounded-lg font-medium transition-all duration-200 ease-in-out"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
            
            {/* Alerts */}
            <div className="flex flex-col gap-2">
              {employee.right_to_work_status === 'expired' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-600 dark:text-red-400">RTW Expired</span>
                </div>
              )}
              {isExpiringSoon(employee.right_to_work_expiry) && employee.right_to_work_status !== 'expired' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">RTW Expiring</span>
                </div>
              )}
              {isInProbation() && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">On Probation</span>
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
                  ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                  : 'text-theme-tertiary hover:text-theme-primary hover:bg-gray-100 dark:hover:bg-white/[0.08] dark:bg-white/[0.05]'
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
 <div className="bg-theme-surface ] border border-theme rounded-lg p-6 shadow-sm dark:shadow-none">
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
          <DocumentsTab employeeId={employee.id} onModalChange={(open: boolean) => { modalOpenRef.current = open; }} />
        )}
        {activeTab === 'leave' && (
          <div className="text-theme-tertiary text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Leave management coming in Phase 2</p>
          </div>
        )}
        {activeTab === 'training' && (
          <EmployeeTrainingTab 
            employeeId={employee.id} 
            companyId={currentUser?.company_id || ''} 
            employeeName={employee.full_name}
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab employeeId={employee.id} />
        )}
        {activeTab === 'pay' && (
          <PayTaxTab employee={employee} onUpdate={fetchEmployee} />
        )}
        {activeTab === 'notes' && (
          <div className="text-theme-tertiary text-center py-8">
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
          <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />
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
          <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />
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
        <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500 dark:text-blue-400" />
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
            <div className="pt-3 border-t border-theme">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-300">
                  <strong>Multi-Site Assignment:</strong> Allow this employee to work at other sites
                </p>
              </div>
              <button
                onClick={() => onOpenSiteAssignments(employee)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-2 border-blue-500 text-blue-400 hover:bg-module-fg/10 hover:shadow-module-glow rounded-lg transition-all font-medium"
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
          <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500 dark:text-blue-400" />
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
      <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        Probation Reviews
      </h3>
      <div className="space-y-3">
        {loadingReviews ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-theme-tertiary" />
          </div>
        ) : probationReviews.length === 0 ? (
          <div className="text-sm text-theme-tertiary py-2">
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
                className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-lg p-4 hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-theme-primary font-medium">
                        {schedule.template?.name || 'Probation Review'}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[schedule.status] || 'bg-neutral-500/10 text-theme-tertiary border-neutral-500/30'}`}>
                        {schedule.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-sm text-theme-tertiary space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled: {scheduledDate}</span>
                        {daysUntil !== null && (
                          <span className={daysUntil < 0 ? 'text-red-400' : daysUntil <= 7 ? 'text-yellow-400' : 'text-theme-tertiary'}>
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
                      className="ml-4 px-3 py-1.5 bg-transparent border border-module-fg text-module-fg rounded text-sm hover:shadow-module-glow dark:hover:shadow-module-glow transition-all"
                    >
                      View Review
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/people/reviews/schedule`}
                      className="ml-4 px-3 py-1.5 bg-transparent border border-module-fg text-module-fg rounded text-sm hover:shadow-module-glow dark:hover:shadow-module-glow transition-all"
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

// Documents Tab (Placeholder - will be expanded)
function DocumentsTab({ employeeId, onModalChange }: { employeeId: string; onModalChange?: (open: boolean) => void }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadOpen, _setUploadOpen] = useState(false);
  const setUploadOpen = (open: boolean) => { _setUploadOpen(open); onModalChange?.(open); };
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Queue-based multi-file upload
  type PendingDoc = { id: string; file: File; docType: string; title: string; expiresAt: string; notes: string };
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [addDocType, setAddDocType] = useState<string>('proof_of_id');
  const [addTitle, setAddTitle] = useState<string>('');
  const [addExpiresAt, setAddExpiresAt] = useState<string>('');
  const [addNotes, setAddNotes] = useState<string>('');

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
    try {
      const resp = await fetch(`/api/people/documents?employeeId=${encodeURIComponent(employeeId)}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to load documents');
      setDocuments(json.data || []);
    } catch (e: any) {
      console.error('Error loading employee documents:', e);
      setErrorMsg(e?.message || 'Failed to load documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
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

  const addToQueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: PendingDoc[] = Array.from(files).map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file: f,
      docType: addDocType,
      title: addTitle || f.name.replace(/\.[^.]+$/, ''),
      expiresAt: addExpiresAt,
      notes: addNotes,
    }));
    setPendingDocs((prev) => [...prev, ...newDocs]);
    setAddTitle('');
    setAddNotes('');
  };

  const removeFromQueue = (id: string) => {
    setPendingDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUploadAll = async () => {
    if (!companyId || !currentUser?.id) {
      toast.error('Missing company or user context');
      return;
    }
    if (pendingDocs.length === 0) {
      toast.error('Add at least one file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: pendingDocs.length });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingDocs.length; i++) {
      const doc = pendingDocs[i];
      setUploadProgress({ done: i, total: pendingDocs.length });
      try {
        const fd = new FormData();
        fd.append('file', doc.file);
        fd.append('companyId', companyId);
        fd.append('employeeId', employeeId);
        fd.append('docType', doc.docType);
        fd.append('title', doc.title);
        if (doc.expiresAt) fd.append('expiresAt', doc.expiresAt);
        if (doc.notes) fd.append('notes', doc.notes);
        fd.append('uploadedBy', currentUser.id);

        const resp = await fetch('/api/people/documents', { method: 'POST', body: fd });
        let json: any;
        try { json = await resp.json(); } catch { json = {}; }
        if (!resp.ok) throw new Error(json?.error || `Upload failed (${resp.status})`);
        successCount++;
      } catch (e: any) {
        console.error(`[DOC UPLOAD] failed for ${doc.title}:`, e);
        failCount++;
      }
    }

    setUploadProgress({ done: pendingDocs.length, total: pendingDocs.length });

    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploaded successfully`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} uploaded, ${failCount} failed`);
    } else {
      toast.error('All uploads failed');
    }

    setPendingDocs([]);
    setUploadProgress(null);
    setUploading(false);
    setUploadOpen(false);
    await fetchDocuments();
  };

  const handleDownload = async (doc: any) => {
    try {
      const resp = await fetch('/api/people/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.file_path, bucketId: doc.bucket_id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Download failed');
      if (json?.signedUrl) window.open(json.signedUrl, '_blank', 'noopener,noreferrer');
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
      const resp = await fetch('/api/people/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: doc.id,
          deletedBy: currentUser.id,
          filePath: doc.file_path,
          bucketId: doc.bucket_id,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Delete failed');

      toast.success('Document deleted');
      await fetchDocuments();
    } catch (e: any) {
      console.error('Delete failed:', e);
      toast.error(`Delete failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const uploadedByType = new Map<string, any[]>();
  documents.forEach((d) => {
    const k = d.document_type || 'other';
    uploadedByType.set(k, [...(uploadedByType.get(k) || []), d]);
  });

  if (loading) {
    return <div className="text-theme-tertiary">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-theme-primary">Documents</h3>
        <button
          onClick={() => { console.log('[DOC] + Upload clicked, opening modal'); setUploadOpen(true); }}
          className="px-4 py-2 bg-transparent border border-module-fg text-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 ease-in-out flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Required docs checklist */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-theme-primary mb-1">Required employee documents</h4>
            <p className="text-xs text-theme-primary/60">Checklist (can be configured per role later)</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">
              {REQUIRED_DOCS.filter((d) => d.required && (uploadedByType.get(d.key)?.length || 0) > 0).length}
            </div>
            <div className="text-xs text-theme-primary/60">of {REQUIRED_DOCS.filter((d) => d.required).length}</div>
          </div>
        </div>

        <div className="space-y-2">
          {REQUIRED_DOCS.filter((d) => d.required).map((d) => {
            const has = (uploadedByType.get(d.key)?.length || 0) > 0;
            return (
              <div
                key={d.key}
                className={`flex items-center gap-2 text-xs p-2 rounded ${
                  has ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-50 dark:bg-white/[0.03] border border-theme'
                }`}
              >
                <span className={has ? 'text-green-400' : 'text-red-400'}>{has ? '✓' : '○'}</span>
                <span className={`flex-1 ${has ? 'text-theme-primary/80' : 'text-theme-primary/60'}`}>{d.label}</span>
                {d.help && <span className="text-theme-primary/40">{d.help}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-tertiary mb-4">No documents uploaded yet</p>
          <button
            onClick={() => { console.log('[DOC] Upload Document clicked, opening modal'); setUploadOpen(true); }}
            className="px-4 py-2 bg-transparent border border-module-fg text-module-fg rounded-lg hover:shadow-[0_0_12px_rgba(var(--module-fg-rgb),0.7)] transition-all duration-200 ease-in-out"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-theme-tertiary" />
                <div>
                  <p className="text-theme-primary">{doc.title}</p>
                  <p className="text-sm text-theme-tertiary">
                    {doc.document_type}
                    {doc.expires_at ? ` · expires ${new Date(doc.expires_at).toLocaleDateString('en-GB')}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-sm text-module-fg hover:underline"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2 rounded-lg hover:bg-white/5 text-theme-tertiary hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal — queue-based multi-file */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-theme-surface-elevated border border-theme rounded-xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-theme-primary font-semibold">Upload documents</h4>
              <button
                onClick={() => { setPendingDocs([]); setUploadOpen(false); }}
                className="p-2 hover:bg-theme-hover rounded-lg text-theme-tertiary hover:text-theme-primary"
                disabled={uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add file form */}
            <div className="bg-theme-surface border border-theme rounded-lg p-3 space-y-2 mb-4">
              <p className="text-xs font-medium text-theme-primary/60 uppercase tracking-wide">Add file to queue</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-theme-primary/60 mb-0.5">Type</label>
                  <select
                    value={addDocType}
                    onChange={(e) => setAddDocType(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-theme-surface-elevated border border-theme rounded-lg text-theme-primary"
                    disabled={uploading}
                  >
                    {REQUIRED_DOCS.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-theme-primary/60 mb-0.5">Title (optional)</label>
                  <input
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Auto-fills from filename"
                    className="w-full px-2 py-1.5 text-sm bg-theme-surface-elevated border border-theme rounded-lg text-theme-primary"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-theme-primary/60 mb-0.5">Expiry (optional)</label>
                  <input
                    type="date"
                    value={addExpiresAt}
                    onChange={(e) => setAddExpiresAt(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-theme-surface-elevated border border-theme rounded-lg text-theme-primary"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-theme-primary/60 mb-0.5">Notes (optional)</label>
                  <input
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-theme-surface-elevated border border-theme rounded-lg text-theme-primary"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-surface-elevated border border-theme rounded-lg text-sm text-theme-primary cursor-pointer hover:border-module-fg transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Choose file(s)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => { addToQueue(e.target.files); e.target.value = ''; }}
                    disabled={uploading}
                  />
                </label>
                <span className="text-xs text-theme-primary/40 ml-2">PDF, images, Word. Max 20MB each.</span>
              </div>
            </div>

            {/* Pending queue */}
            {pendingDocs.length > 0 && (
              <div className="mb-4 space-y-1.5">
                <p className="text-xs font-medium text-theme-primary/60 uppercase tracking-wide">
                  Ready to upload ({pendingDocs.length} file{pendingDocs.length > 1 ? 's' : ''})
                </p>
                {pendingDocs.map((doc) => {
                  const docLabel = REQUIRED_DOCS.find((d) => d.key === doc.docType)?.label || doc.docType;
                  return (
                    <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-theme-surface border border-theme rounded-lg text-sm">
                      <FileText className="w-4 h-4 text-theme-tertiary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-theme-primary truncate">{doc.title}</p>
                        <p className="text-xs text-theme-primary/50">{docLabel}{doc.expiresAt ? ` · exp ${doc.expiresAt}` : ''}</p>
                      </div>
                      <span className="text-xs text-theme-primary/40">{(doc.file.size / 1024).toFixed(0)} KB</span>
                      {!uploading && (
                        <button
                          onClick={() => removeFromQueue(doc.id)}
                          className="p-1 hover:bg-white/5 rounded text-theme-tertiary hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload progress */}
            {uploadProgress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-theme-primary/60 mb-1">
                  <span>Uploading…</span>
                  <span>{uploadProgress.done} / {uploadProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-theme-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-module-fg rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Empty state */}
            {pendingDocs.length === 0 && !uploading && (
              <div className="text-center py-4 text-sm text-theme-primary/40">
                Select a document type, then click &quot;Choose file(s)&quot; to add files
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-theme mt-2">
              <button
                onClick={() => { setPendingDocs([]); setUploadOpen(false); }}
                className="px-4 py-2 bg-theme-surface border border-theme text-theme-primary rounded-lg text-sm"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAll}
                className="px-4 py-2 bg-module-fg text-white font-medium rounded-lg disabled:opacity-50 text-sm"
                disabled={uploading || pendingDocs.length === 0}
              >
                {uploading
                  ? `Uploading ${uploadProgress?.done ?? 0}/${uploadProgress?.total ?? 0}…`
                  : `Upload ${pendingDocs.length || ''} document${pendingDocs.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding pack sending */}
      <div className="bg-gray-50 dark:bg-white/[0.03] border border-theme rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-theme-primary mb-1">Send onboarding pack</h4>
            <p className="text-xs text-theme-primary/60">Role-based: filter by BOH/FOH and hourly/salaried</p>
          </div>
          <button
            onClick={sendPack}
            disabled={sendingPack || !selectedPackId}
            className="px-4 py-2 bg-module-fg text-theme-primary rounded-lg disabled:opacity-50"
          >
            {sendingPack ? 'Sending…' : 'Send pack'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div>
            <label className="block text-xs text-theme-primary/70 mb-1">BOH/FOH</label>
            <select
              value={bohFoh}
              onChange={(e) => setBohFoh(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary"
            >
              <option value="FOH">FOH</option>
              <option value="BOH">BOH</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-theme-primary/70 mb-1">Pay type</label>
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary"
            >
              <option value="hourly">Hourly</option>
              <option value="salaried">Salaried</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-theme-primary/70 mb-1">Pack</label>
            <select
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary"
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
            <div className="text-sm text-theme-primary/70">
              No packs exist for these filters.{' '}
              <button className="text-module-fg hover:underline" onClick={() => setCreatingPack(true)}>
                Create one
              </button>
              .
            </div>
          ) : (
            <div className="text-xs text-theme-primary/60">
              {packDocs.length ? `${packDocs.length} document(s) in this pack.` : 'Select a pack to preview documents.'}
            </div>
          )}
        </div>

        {packDocs.length > 0 && (
          <div className="mt-3 space-y-2">
            {packDocs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50 dark:bg-white/[0.03] border border-theme">
                <div className="text-theme-primary/80">{d.global_documents?.name || 'Document'}</div>
                <div className="text-theme-primary/40">{d.global_documents?.category || ''}</div>
              </div>
            ))}
          </div>
        )}

        {creatingPack && (
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-theme-primary font-semibold text-sm">Create pack</h5>
              <button
                onClick={() => setCreatingPack(false)}
                className="text-theme-primary/60 hover:text-theme-primary text-sm"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-theme-primary/70 mb-1">Pack name</label>
                <input
                  value={newPackName}
                  onChange={(e) => setNewPackName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-theme rounded-lg text-theme-primary"
                  placeholder="e.g. FOH Hourly Starter Pack"
                />
                <p className="text-xs text-theme-primary/40 mt-1">Saved with current filters: {bohFoh} / {payType}</p>
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={createPack}
                  className="px-4 py-2 bg-module-fg text-theme-primary rounded-lg"
                >
                  Save pack
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs text-theme-primary/60">Select global documents to include:</div>
                <button
                  onClick={applySuggestedPackSelection}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-theme-primary"
                  type="button"
                >
                  Use suggested pack
                </button>
              </div>
              <div className="max-h-56 overflow-auto space-y-1">
                {globalDocs.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-theme-primary/80 p-2 rounded bg-white/[0.02] border border-theme">
                    <input
                      type="checkbox"
                      checked={newPackDocIds.has(d.id)}
                      onChange={() => toggleNewPackDoc(d.id)}
                    />
                    <span className="flex-1">{d.name}</span>
                    <span className="text-theme-primary/40 text-xs">{d.category || ''}</span>
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
        <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-module-fg" />
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
        <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-module-fg" />
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
    return <div className="text-theme-tertiary">Loading attendance...</div>;
  }

  if (attendance.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
        <p className="text-theme-tertiary">No attendance records yet</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-theme-primary mb-4">Recent Attendance</h3>
      <div className="space-y-2">
        {attendance.map((record) => (
          <div key={record.id} className="flex items-center justify-between p-3 bg-theme-surface-elevated rounded-lg">
            <div>
              <p className="text-theme-primary">
                {new Date(record.clock_in_time).toLocaleDateString('en-GB', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </p>
              <p className="text-sm text-theme-tertiary">
                {record.sites?.name || 'Unknown site'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-theme-primary">
                {new Date(record.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {record.clock_out_time 
                  ? new Date(record.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : 'On shift'
                }
              </p>
              {record.total_hours && (
                <p className="text-sm text-theme-tertiary">{record.total_hours.toFixed(1)} hours</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
