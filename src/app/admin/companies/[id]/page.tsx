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
  Clock,
  AlertTriangle,
  Loader2,
  Mail,
  MapPin
} from '@/components/ui/icons';

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

  useEffect(() => {
    if (companyId) {
      fetchCompanyDetails();
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

  const handleViewAs = () => {
    if (!company) return;

    sessionStorage.setItem('admin_viewing_as_company', JSON.stringify({
      id: company.id,
      name: company.name
    }));
    router.push('/dashboard');
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
        <p className="text-white/60">Company not found</p>
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
            className="p-2 hover:bg-white/[0.1] rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-xl bg-[#D37E91]/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-[#D37E91]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{company.name}</h1>
            <p className="text-white/60 flex items-center gap-2 mt-1">
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
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-white/60 text-sm">Users</span>
          </div>
          <div className="text-2xl font-bold text-white">{users.length}</div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-5 h-5 text-green-400" />
            <span className="text-white/60 text-sm">Sites</span>
          </div>
          <div className="text-2xl font-bold text-white">{sites.length}</div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            <span className="text-white/60 text-sm">Total Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white">{taskStats.total}</div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-white/60 text-sm">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">{completionRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-white/60" />
            Users ({users.length})
          </h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg">
                <div>
                  <div className="text-white font-medium">{user.full_name || 'No name'}</div>
                  <div className="text-white/40 text-sm flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-sm capitalize">{user.app_role || 'User'}</div>
                  <div className="text-white/40 text-xs">
                    {user.last_login 
                      ? `Active ${new Date(user.last_login).toLocaleDateString()}`
                      : 'Never logged in'
                    }
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-white/40 text-center py-4">No users found</p>
            )}
          </div>
        </div>

        {/* Sites & Task Breakdown */}
        <div className="space-y-6">
          {/* Sites */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-white/60" />
              Sites ({sites.length})
            </h2>
            <div className="space-y-2">
              {sites.map(site => (
                <div key={site.id} className="p-3 bg-white/[0.03] rounded-lg text-white">
                  {site.name}
                </div>
              ))}
              {sites.length === 0 && (
                <p className="text-white/40 text-center py-4">No sites found</p>
              )}
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Task Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completed</span>
                </div>
                <span className="text-white font-semibold">{taskStats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock className="w-4 h-4" />
                  <span>Pending</span>
                </div>
                <span className="text-white font-semibold">{taskStats.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missed</span>
                </div>
                <span className="text-white font-semibold">{taskStats.missed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

