"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Building2,
  Users,
  ClipboardList,
  Eye,
  Calendar,
  CheckCircle2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Mail,
  MapPin,
  UserPlus,
  Rocket,
  SkipForward,
  FileEdit,
} from '@/components/ui/icons';
import AddUserModal from '@/components/admin/AddUserModal';
import {
  ONBOARDING_STEPS,
  ONBOARDING_SECTIONS,
  SECTION_ORDER,
  type OnboardingSection,
  type OnboardingProgress,
  type StepStatus,
} from '@/types/onboarding';

interface CompanyDetails {
  id: string;
  name: string;
  created_at: string | null;
}

interface CompanyUser {
  id: string;
  full_name: string | null;
  email: string | null;
  app_role: "Admin" | "Manager" | "Staff" | "Owner" | "General Manager";
  last_login: string | null;
  position_title: string | null;
}

interface CompanySite {
  id: string;
  name: string;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  missed: number;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats>({ total: 0, completed: 0, pending: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress[]>([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
      fetchOnboardingProgress();
    }
  }, [companyId]);

  async function fetchCompanyDetails() {
    setLoading(true);
    try {
      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email, app_role, last_login, position_title')
        .eq('company_id', companyId)
        .order('full_name');

      setUsers(usersData || []);

      // Fetch sites
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');

      setSites(sitesData || []);

      // Fetch task stats
      const [
        { count: totalTasks },
        { count: completedTasks },
        { count: pendingTasks },
        { count: missedTasks }
      ] = await Promise.all([
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'completed'),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending'),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'missed')
      ]);

      setTaskStats({
        total: totalTasks || 0,
        completed: completedTasks || 0,
        pending: pendingTasks || 0,
        missed: missedTasks || 0
      });

    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOnboardingProgress() {
    setOnboardingLoading(true);
    try {
      const res = await fetch(`/api/onboarding/progress?companyId=${companyId}`);
      if (res.ok) {
        const { progress } = await res.json();
        setOnboardingProgress(progress || []);
      }
    } catch (err) {
      console.error('Error fetching onboarding progress:', err);
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function handleUpdateStep(stepId: string, status: StepStatus) {
    try {
      const res = await fetch('/api/onboarding/update-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, stepId, status }),
      });
      if (res.ok) {
        await fetchOnboardingProgress();
      }
    } catch (err) {
      console.error('Error updating step:', err);
    }
  }

  const handleViewAs = () => {
    if (!company) return;

    sessionStorage.setItem('admin_viewing_as_company', JSON.stringify({
      id: company.id,
      name: company.name
    }));
    router.push('/dashboard');
  };

  const handleViewAsSetup = () => {
    if (!company) return;

    sessionStorage.setItem('admin_viewing_as_company', JSON.stringify({
      id: company.id,
      name: company.name
    }));
    router.push('/dashboard/business');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8">
        <p className="text-theme-tertiary">Company not found</p>
      </div>
    );
  }

  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/companies')}
            className="p-2 hover:bg-gray-100 rounded-lg text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-xl bg-[#D37E91]/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-[#D37E91]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-theme-primary">{company.name}</h1>
            <p className="text-theme-tertiary flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              Joined {company.created_at ? new Date(company.created_at).toLocaleDateString() : 'Unknown date'}
            </p>
          </div>
        </div>
        <button
          onClick={handleViewAs}
          className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg font-medium transition-all duration-200 ease-in-out"
        >
          <Eye className="w-5 h-5" />
          View As This Company
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-theme-tertiary text-sm">Users</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary">{users.length}</div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-green-600" />
            <span className="text-theme-tertiary text-sm">Sites</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary">{sites.length}</div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ClipboardList className="w-5 h-5 text-purple-500" />
            <span className="text-theme-tertiary text-sm">Total Tasks</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary">{taskStats.total}</div>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-theme-tertiary text-sm">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary">{completionRate}%</div>
        </div>
      </div>

      {/* Setup Progress Section */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#D37E91]" />
            Setup Progress
            {!onboardingLoading && (
              <span className="text-sm font-normal text-theme-tertiary ml-2">
                {onboardingProgress.filter(p => p.status === 'complete' || p.status === 'skipped').length}/{ONBOARDING_STEPS.length} steps
              </span>
            )}
          </h2>
          <button
            onClick={handleViewAsSetup}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#D37E91] text-white rounded-lg font-medium hover:bg-[#C06B7E] transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            View As + Enter Setup
          </button>
        </div>

        {onboardingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#D37E91] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall progress bar */}
            {(() => {
              const done = onboardingProgress.filter(p => p.status === 'complete' || p.status === 'skipped').length;
              const total = ONBOARDING_STEPS.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-theme-tertiary">Overall</span>
                    <span className="font-medium text-theme-primary">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D37E91] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Sections */}
            {SECTION_ORDER.map((sectionKey) => {
              const meta = ONBOARDING_SECTIONS[sectionKey];
              const sectionSteps = ONBOARDING_STEPS.filter(s => s.section === sectionKey);
              const sectionProgress = sectionSteps.map(step => {
                const p = onboardingProgress.find(op => op.step_id === step.stepId);
                return { ...step, status: (p?.status || 'not_started') as StepStatus, notes: p?.notes || null };
              });
              const sectionDone = sectionProgress.filter(s => s.status === 'complete' || s.status === 'skipped').length;

              return (
                <div key={sectionKey} className="border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-theme-primary">{meta.label}</span>
                      <span className="text-xs text-theme-tertiary">{sectionDone}/{sectionSteps.length}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D37E91] rounded-full transition-all"
                        style={{ width: `${sectionSteps.length > 0 ? (sectionDone / sectionSteps.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sectionProgress.map((step) => {
                      const isDone = step.status === 'complete' || step.status === 'skipped';
                      return (
                        <div key={step.stepId} className="flex items-center gap-3 px-4 py-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
                          </div>
                          <span className={`text-sm flex-1 ${isDone ? 'text-theme-tertiary line-through' : 'text-theme-primary'}`}>
                            {step.name}
                          </span>
                          {step.notes && (
                            <span className="text-xs text-theme-tertiary max-w-[200px] truncate" title={step.notes}>
                              <FileEdit className="w-3 h-3 inline mr-1" />{step.notes}
                            </span>
                          )}
                          {!isDone && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateStep(step.stepId, 'skipped')}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Skip"
                              >
                                <SkipForward className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleUpdateStep(step.stepId, 'complete')}
                                className="p-1 text-green-400 hover:text-green-600 rounded"
                                title="Mark complete"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isDone && (
                            <button
                              onClick={() => handleUpdateStep(step.stepId, 'not_started')}
                              className="text-xs text-gray-400 hover:text-gray-600"
                              title="Reset"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-theme-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-theme-tertiary" />
              Users ({users.length})
            </h2>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#D37E91] text-white rounded-lg font-medium hover:bg-[#C06B7E] transition-colors text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-theme-primary font-medium">{user.full_name || 'No name'}</div>
                  <div className="text-theme-tertiary text-sm flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-theme-tertiary text-sm capitalize">{user.app_role || 'User'}</div>
                  <div className="text-theme-tertiary text-xs">
                    {user.last_login 
                      ? `Active ${new Date(user.last_login).toLocaleDateString()}`
                      : 'Never logged in'
                    }
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-theme-tertiary text-center py-4">No users found</p>
            )}
          </div>
        </div>

        {/* Sites & Task Breakdown */}
        <div className="space-y-6">
          {/* Sites */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-theme-tertiary" />
              Sites ({sites.length})
            </h2>
            <div className="space-y-2">
              {sites.map(site => (
                <div key={site.id} className="p-3 bg-gray-50 rounded-lg text-theme-primary">
                  {site.name}
                </div>
              ))}
              {sites.length === 0 && (
                <p className="text-theme-tertiary text-center py-4">No sites found</p>
              )}
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <h2 className="text-xl font-semibold text-theme-primary mb-4">Task Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
                <span className="text-theme-primary font-semibold">{taskStats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-600">
                  <Clock className="w-4 h-4" />
                  <span>Pending</span>
                </div>
                <span className="text-theme-primary font-semibold">{taskStats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missed</span>
                </div>
                <span className="text-theme-primary font-semibold">{taskStats.missed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {company && (
        <AddUserModal
          open={showAddUserModal}
          onOpenChange={setShowAddUserModal}
          companyId={company.id}
          companyName={company.name}
          onSuccess={() => fetchCompanyDetails()}
        />
      )}
    </div>
  );
}

