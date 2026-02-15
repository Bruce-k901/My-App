"use client";

// CRITICAL: Log at module level to verify file is loaded
console.log('📦📦📦 AdminDashboardPage MODULE LOADED', new Date().toISOString());

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  ShieldAlert,
  Wrench,
  MessageSquare,
  Phone,
  Award,
  RefreshCw,
  HeartPulse
} from '@/components/ui/icons';
import Link from 'next/link';

interface PlatformStats {
  total_companies: number;
  new_companies_this_week: number;
  new_companies_this_month: number;
  total_users: number;
  active_users_today: number;
  active_users_this_week: number;
  platform_admins: number;
  total_sites: number;
  total_tasks: number;
  pending_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  missed_tasks: number;
  tasks_created_today: number;
  tasks_completed_today: number;
  total_completion_records: number;
  completions_today: number;
  completions_this_week: number;
  library_templates: number;
  custom_templates: number;
  total_sops: number;
  active_sops: number;
  sops_created_this_month: number;
  total_risk_assessments: number;
  active_risk_assessments: number;
  overdue_risk_assessments: number;
  total_assets: number;
  active_assets: number;
  overdue_service_assets: number;
  total_messages: number;
  messages_today: number;
  messages_this_week: number;
  total_channels: number;
  total_callouts: number;
  open_callouts: number;
  callouts_this_week: number;
}

interface CompanyWithEHO {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  site_count: number;
  task_count: number;
  sop_count: number;
  ra_count: number;
  asset_count: number;
  eho_score: number | null;
  task_completion_score: number | null;
  sop_coverage_score: number | null;
  ra_coverage_score: number | null;
  asset_compliance_score: number | null;
  eho_details: any;
}

export default function AdminDashboardPage() {
  // CRITICAL: Log at the very top to ensure component is executing
  console.log('🚀🚀🚀 AdminDashboardPage component function called - TOP LEVEL');
  console.log('🚀🚀🚀 Current timestamp:', new Date().toISOString());
  
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  console.log('🚀🚀🚀 AdminDashboardPage hooks initialized', { 
    pathname, 
    routerExists: !!router,
    searchParamsExists: !!searchParams 
  });
  // Initialize with empty stats so sections always render
  const [stats, setStats] = useState<PlatformStats>(() => ({
    total_companies: 0,
    new_companies_this_week: 0,
    new_companies_this_month: 0,
    total_users: 0,
    active_users_today: 0,
    active_users_this_week: 0,
    platform_admins: 0,
    total_sites: 0,
    total_tasks: 0,
    pending_tasks: 0,
    active_tasks: 0,
    completed_tasks: 0,
    missed_tasks: 0,
    tasks_created_today: 0,
    tasks_completed_today: 0,
    total_completion_records: 0,
    completions_today: 0,
    completions_this_week: 0,
    library_templates: 0,
    custom_templates: 0,
    total_sops: 0,
    active_sops: 0,
    sops_created_this_month: 0,
    total_risk_assessments: 0,
    active_risk_assessments: 0,
    overdue_risk_assessments: 0,
    total_assets: 0,
    active_assets: 0,
    overdue_service_assets: 0,
    total_messages: 0,
    messages_today: 0,
    messages_this_week: 0,
    total_channels: 0,
    total_callouts: 0,
    open_callouts: 0,
    callouts_this_week: 0
  }));
  const [companiesWithEHO, setCompaniesWithEHO] = useState<CompanyWithEHO[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set mounted flag and fetch immediately
  useEffect(() => {
    console.log('🔄 Component mounting, setting mounted=true');
    setMounted(true);
  }, []);

  // ALWAYS fetch when pathname is /admin - NO CONDITIONS
  useEffect(() => {
    console.log('🔄🔄🔄 useEffect[pathname] running', { 
      pathname, 
      mounted, 
      willFetch: pathname === '/admin',
      timestamp: new Date().toISOString()
    });
    
    if (pathname === '/admin') {
      console.log('🔄🔄🔄 Pathname is /admin, calling fetchDashboardData NOW');
      fetchDashboardData();
    } else {
      console.log('⚠️⚠️⚠️ Pathname is not /admin, skipping fetch', pathname);
    }
  }, [pathname]); // Fetch whenever pathname changes

  // Force refetch when component becomes visible (navigation back to page)
  useEffect(() => {
    if (!mounted) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pathname === '/admin') {
        console.log('🔄 Tab visible, forcing data refresh');
        fetchDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pathname, mounted]);

  // Refetch when window regains focus
  useEffect(() => {
    if (pathname !== '/admin') return;
    
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing admin data');
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [pathname]);

  async function fetchDashboardData() {
    console.log('🔄🔄🔄 fetchDashboardData CALLED - STARTING FETCH', {
      timestamp: new Date().toISOString(),
      pathname
    });
    setLoading(true);
    try {
      // Always fetch directly - no view caching
      const statsData = await fetchStatsDirect();
      console.log('📊 Setting stats:', statsData);
      // Force React to see this as a new object by spreading
      setStats({ ...statsData });

      // Fetch companies with EHO scores
      const { data: ehoData, error: ehoError } = await supabase
        .from('admin_company_eho_scores')
        .select('*')
        .order('eho_score', { ascending: true, nullsFirst: false })
        .limit(10);

      if (!ehoError && ehoData && ehoData.length > 0) {
        setCompaniesWithEHO(ehoData);
      } else {
        await fetchCompaniesFallback();
      }

      setLastFetch(new Date());
      console.log('✅✅✅ Data fetched successfully', {
        statsData,
        active_sops: statsData.active_sops,
        total_messages: statsData.total_messages,
        pending_tasks: statsData.pending_tasks,
        active_tasks: statsData.active_tasks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      setStats(getEmptyStats());
      setCompaniesWithEHO([]);
    } finally {
      setLoading(false);
    }
  }

  function getEmptyStats(): PlatformStats {
    return {
      total_companies: 0,
      new_companies_this_week: 0,
      new_companies_this_month: 0,
      total_users: 0,
      active_users_today: 0,
      active_users_this_week: 0,
      platform_admins: 0,
      total_sites: 0,
      total_tasks: 0,
      pending_tasks: 0,
      active_tasks: 0,
      completed_tasks: 0,
      missed_tasks: 0,
      tasks_created_today: 0,
      tasks_completed_today: 0,
      total_completion_records: 0,
      completions_today: 0,
      completions_this_week: 0,
      library_templates: 0,
      custom_templates: 0,
      total_sops: 0,
      active_sops: 0,
      sops_created_this_month: 0,
      total_risk_assessments: 0,
      active_risk_assessments: 0,
      overdue_risk_assessments: 0,
      total_assets: 0,
      active_assets: 0,
      overdue_service_assets: 0,
      total_messages: 0,
      messages_today: 0,
      messages_this_week: 0,
      total_channels: 0,
      total_callouts: 0,
      open_callouts: 0,
      callouts_this_week: 0
    };
  }

  async function fetchStatsDirect(): Promise<PlatformStats> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    try {
      // Fetch all data in parallel
      const [
        companiesRes,
        usersRes,
        sitesRes,
        tasksRes,
        completionRecordsRes,
        templatesRes,
        sopsRes,
        rasRes,
        assetsRes,
        messagesRes,
        channelsRes,
        calloutsRes
      ] = await Promise.all([
        supabase.from('companies').select('id, created_at'),
        supabase.from('profiles').select('id, last_login, is_platform_admin'),
        supabase.from('sites').select('id'),
        supabase.from('checklist_tasks').select('id, status, completed_at, created_at, due_date'),
        supabase.from('task_completion_records').select('id, completed_at'),
        supabase.from('task_templates').select('id, is_template_library, company_id, is_active'),
        supabase.from('sop_entries').select('id, status, created_at'),
        supabase.from('risk_assessments').select('id, status, next_review_date'),
        supabase.from('assets').select('id, status, next_service_date'),
        supabase.from('messaging_messages').select('id, created_at'),
        supabase.from('messaging_channels').select('id'),
        supabase.from('callouts').select('id, status, created_at')
      ]);

      // Calculate stats
      const companies = companiesRes.data || [];
      const users = usersRes.data || [];
      const tasks = tasksRes.data || [];
      const today = new Date(todayStr);

      // Pending tasks: status='pending' AND due_date >= today (not overdue)
      const pendingTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.due_date && 
        new Date(t.due_date) >= today
      );

      // Active tasks: status IN ('pending', 'in_progress') AND not overdue
      const activeTasks = tasks.filter(t => 
        (t.status === 'pending' || t.status === 'in_progress') &&
        t.due_date &&
        new Date(t.due_date) >= today
      );

      // Completed tasks
      const completedTasks = tasks.filter(t => t.status === 'completed');

      // Missed tasks: status='pending' but due_date < today
      const missedTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.due_date && 
        new Date(t.due_date) < today
      );

      // Active SOPs: status = 'Published'
      const activeSOPs = (sopsRes.data || []).filter(s => s.status === 'Published');

      return {
        total_companies: companies.length,
        new_companies_this_week: companies.filter(c => c.created_at && new Date(c.created_at) > weekAgo).length,
        new_companies_this_month: companies.filter(c => c.created_at && new Date(c.created_at) > monthAgo).length,
        total_users: users.length,
        active_users_today: users.filter(u => u.last_login && new Date(u.last_login) > dayAgo).length,
        active_users_this_week: users.filter(u => u.last_login && new Date(u.last_login) > weekAgo).length,
        platform_admins: users.filter(u => u.is_platform_admin).length,
        total_sites: sitesRes.data?.length || 0,
        total_tasks: tasks.length,
        pending_tasks: pendingTasks.length,
        active_tasks: activeTasks.length,
        completed_tasks: completedTasks.length,
        missed_tasks: missedTasks.length,
        tasks_created_today: tasks.filter(t => t.created_at && new Date(t.created_at) > dayAgo).length,
        tasks_completed_today: tasks.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) > dayAgo).length,
        total_completion_records: completionRecordsRes.data?.length || 0,
        completions_today: (completionRecordsRes.data || []).filter(c => c.completed_at && new Date(c.completed_at) > dayAgo).length,
        completions_this_week: (completionRecordsRes.data || []).filter(c => c.completed_at && new Date(c.completed_at) > weekAgo).length,
        library_templates: (templatesRes.data || []).filter(t => t.is_template_library).length,
        custom_templates: (templatesRes.data || []).filter(t => t.company_id && t.is_active).length,
        total_sops: sopsRes.data?.length || 0,
        active_sops: activeSOPs.length,
        sops_created_this_month: (sopsRes.data || []).filter(s => s.created_at && new Date(s.created_at) > monthAgo).length,
        total_risk_assessments: rasRes.data?.length || 0,
        active_risk_assessments: (rasRes.data || []).filter(r => r.status === 'Active' || r.status === 'Published').length,
        overdue_risk_assessments: (rasRes.data || []).filter(r => r.next_review_date && new Date(r.next_review_date) <= now).length,
        total_assets: assetsRes.data?.length || 0,
        active_assets: (assetsRes.data || []).filter(a => a.status === 'active').length,
        overdue_service_assets: (assetsRes.data || []).filter(a => a.next_service_date && new Date(a.next_service_date) <= now).length,
        total_messages: messagesRes.data?.length || 0,
        messages_today: (messagesRes.data || []).filter(m => m.created_at && new Date(m.created_at) > dayAgo).length,
        messages_this_week: (messagesRes.data || []).filter(m => m.created_at && new Date(m.created_at) > weekAgo).length,
        total_channels: channelsRes.data?.length || 0,
        total_callouts: calloutsRes.data?.length || 0,
        open_callouts: (calloutsRes.data || []).filter(c => c.status === 'open').length,
        callouts_this_week: (calloutsRes.data || []).filter(c => c.created_at && new Date(c.created_at) > weekAgo).length
      };
    } catch (error) {
      console.error('Error fetching stats directly:', error);
      return getEmptyStats();
    }
  }

  async function fetchCompaniesFallback() {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !companies) {
        setCompaniesWithEHO([]);
        return;
      }

      const enriched = await Promise.all(
        companies.map(async (company) => {
          try {
            const [users, tasks, sops, ras, assets] = await Promise.all([
              supabase.from('profiles').select('id').eq('company_id', company.id),
              supabase.from('checklist_tasks').select('id').eq('company_id', company.id),
              supabase.from('sop_entries').select('id, status').eq('company_id', company.id),
              supabase.from('risk_assessments').select('id').eq('company_id', company.id),
              supabase.from('assets').select('id').eq('company_id', company.id)
            ]);
            return {
              ...company,
              user_count: users.data?.length || 0,
              site_count: 0,
              task_count: tasks.data?.length || 0,
              sop_count: (sops.data || []).filter(s => s.status === 'Published').length,
              ra_count: ras.data?.length || 0,
              asset_count: assets.data?.length || 0,
              eho_score: null,
              task_completion_score: null,
              sop_coverage_score: null,
              ra_coverage_score: null,
              asset_compliance_score: null,
              eho_details: null
            };
          } catch (err) {
            console.error(`Error enriching company ${company.id}:`, err);
            return {
              ...company,
              user_count: 0,
              site_count: 0,
              task_count: 0,
              sop_count: 0,
              ra_count: 0,
              asset_count: 0,
              eho_score: null,
              task_completion_score: null,
              sop_coverage_score: null,
              ra_coverage_score: null,
              asset_compliance_score: null,
              eho_details: null
            };
          }
        })
      );
      setCompaniesWithEHO(enriched);
    } catch (error) {
      console.error('Error in fetchCompaniesFallback:', error);
      setCompaniesWithEHO([]);
    }
  }

  function getEHOScoreColor(score: number | null): string {
    if (score === null) return 'text-theme-tertiary';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function getEHOScoreBg(score: number | null): string {
    if (score === null) return 'bg-theme-surface-elevated0/10';
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    if (score >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  }

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    router.refresh();
    fetchDashboardData();
  };

  // Show loading spinner only if we haven't mounted yet
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  console.log('🔄 Rendering AdminDashboardPage', { 
    mounted, 
    loading, 
    statsExists: !!stats, 
    statsKeys: stats ? Object.keys(stats) : [],
    pathname,
    // Show key stats values
    active_sops: stats?.active_sops,
    total_sops: stats?.total_sops,
    total_messages: stats?.total_messages,
    messages_today: stats?.messages_today,
    pending_tasks: stats?.pending_tasks,
    active_tasks: stats?.active_tasks,
    total_tasks: stats?.total_tasks,
    total_risk_assessments: stats?.total_risk_assessments,
    total_assets: stats?.total_assets,
    total_callouts: stats?.total_callouts,
    open_callouts: stats?.open_callouts,
    library_templates: stats?.library_templates,
    custom_templates: stats?.custom_templates
  });

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Platform Overview</h1>
          <p className="text-theme-tertiary">Monitor all Opsly customers and platform health</p>
          {lastFetch && (
            <p className="text-xs text-theme-tertiary mt-1">
              Last updated: {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-module-glow rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Access Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/health-check-test"
          className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] hover:border-module-fg/30 transition-all group"
        >
          <div className="p-3 bg-module-fg/10 rounded-lg">
            <HeartPulse className="w-6 h-6 text-module-fg" />
          </div>
          <div className="flex-1">
            <div className="text-theme-primary font-semibold group-hover:text-module-fg transition-colors">Health Check Test</div>
            <div className="text-xs text-theme-tertiary">Reports, calendar tasks, delegation & AI fix testing</div>
          </div>
          <ArrowRight className="w-4 h-4 text-theme-disabled group-hover:text-module-fg transition-colors" />
        </Link>
      </div>

      {/* Primary Stats Grid - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Companies */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#D37E91]/10 rounded-lg">
              <Building2 className="w-6 h-6 text-[#D37E91]" />
            </div>
            {stats && stats.new_companies_this_week > 0 && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-medium">
                +{stats.new_companies_this_week} this week
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-theme-primary mb-1">{stats.total_companies}</div>
          <div className="text-sm text-theme-tertiary">Total Companies</div>
        </div>

        {/* Total Users */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            {stats && stats.active_users_today > 0 && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full font-medium">
                {stats.active_users_today} active today
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-theme-primary mb-1">{stats.total_users}</div>
          <div className="text-sm text-theme-tertiary">Total Users</div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-yellow-400" />
            </div>
            {stats && stats.tasks_completed_today > 0 && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-medium">
                {stats.tasks_completed_today} done today
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-theme-primary mb-1">{stats.pending_tasks}</div>
          <div className="text-sm text-theme-tertiary">Pending Tasks</div>
          {stats && stats.missed_tasks > 0 && (
            <div className="text-xs text-red-400 mt-1">{stats.missed_tasks} overdue</div>
          )}
        </div>

        {/* Missed Tasks */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-theme-primary mb-1">{stats.missed_tasks}</div>
          <div className="text-sm text-theme-tertiary">Missed Tasks</div>
        </div>
      </div>

      {/* Secondary Stats Row - 6 Compact Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-theme-primary">Platform Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Active SOPs */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-theme-tertiary font-medium">Active SOPs</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.active_sops}</div>
            {stats && stats.total_sops > stats.active_sops && (
              <div className="text-xs text-theme-tertiary">{stats.total_sops} total</div>
            )}
          </Link>

          {/* Risk Assessments */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-theme-tertiary font-medium">Risk Assessments</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.total_risk_assessments}</div>
            {stats && stats.overdue_risk_assessments > 0 && (
              <div className="text-xs text-red-400 font-medium">{stats.overdue_risk_assessments} overdue</div>
            )}
          </Link>

          {/* Assets */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-module-fg" />
              <span className="text-xs text-theme-tertiary font-medium">Assets</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.total_assets}</div>
            {stats && stats.overdue_service_assets > 0 && (
              <div className="text-xs text-red-400 font-medium">{stats.overdue_service_assets} need service</div>
            )}
          </Link>

          {/* Messages */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-green-400" />
              <span className="text-xs text-theme-tertiary font-medium">Messages</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.total_messages}</div>
            {stats && stats.messages_today > 0 && (
              <div className="text-xs text-green-400">{stats.messages_today} today</div>
            )}
          </Link>

          {/* Callouts */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-red-400" />
              <span className="text-xs text-theme-tertiary font-medium">Callouts</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.total_callouts}</div>
            {stats && stats.open_callouts > 0 && (
              <div className="text-xs text-yellow-400 font-medium">{stats.open_callouts} open</div>
            )}
          </Link>

          {/* Sites */}
          <Link href="/admin/companies" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-module-fg" />
              <span className="text-xs text-theme-tertiary font-medium">Sites</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">{stats.total_sites}</div>
          </Link>
        </div>
      </div>

      {/* Additional Stats Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-theme-primary">Additional Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Total Tasks</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.total_tasks}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Active Tasks</div>
              <div className="text-xl font-semibold text-blue-400">{stats.active_tasks}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Completed Tasks</div>
              <div className="text-xl font-semibold text-green-400">{stats.completed_tasks}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Completions Today</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.completions_today}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Library Templates</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.library_templates}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Custom Templates</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.custom_templates}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Active Users (Week)</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.active_users_this_week}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Messages (Week)</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.messages_this_week}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Callouts (Week)</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.callouts_this_week}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Active RAs</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.active_risk_assessments}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Active Assets</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.active_assets}</div>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
              <div className="text-xs text-theme-tertiary mb-1 font-medium">Message Channels</div>
              <div className="text-xl font-semibold text-theme-primary">{stats.total_channels}</div>
            </div>
          </div>
      </div>

      {/* EHO Readiness Scores Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D37E91]/10 rounded-lg">
              <Award className="w-6 h-6 text-[#D37E91]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">EHO Readiness Scores</h2>
              <p className="text-sm text-theme-tertiary">Companies ranked by compliance readiness (lowest first)</p>
            </div>
          </div>
          <Link 
            href="/admin/companies" 
            className="text-[#D37E91] hover:text-[#D37E91]/80 text-sm flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Score Legend */}
        <div className="flex items-center gap-4 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40"></div>
            <span className="text-theme-tertiary">80+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40"></div>
            <span className="text-theme-tertiary">60-79 Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/40"></div>
            <span className="text-theme-tertiary">40-59 Needs Improvement</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40"></div>
            <span className="text-theme-tertiary">0-39 Critical</span>
          </div>
        </div>

        {companiesWithEHO.length === 0 ? (
          <p className="text-theme-tertiary text-center py-8">No companies yet</p>
        ) : (
          <div className="space-y-3">
            {companiesWithEHO.map((company) => (
              <Link
                key={company.id}
                href={`/admin/companies/${company.id}`}
                className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* EHO Score Badge */}
                  <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${getEHOScoreBg(company.eho_score)} border-2 ${company.eho_score !== null && company.eho_score >= 80 ? 'border-green-500/30' : company.eho_score !== null && company.eho_score >= 60 ? 'border-yellow-500/30' : company.eho_score !== null && company.eho_score >= 40 ? 'border-orange-500/30' : 'border-red-500/30'}`}>
                    <span className={`text-xl font-bold ${getEHOScoreColor(company.eho_score)}`}>
                      {company.eho_score !== null ? company.eho_score : '—'}
                    </span>
                    <span className="text-[10px] text-theme-tertiary font-medium">EHO</span>
                  </div>
                  
                  <div>
                    <h3 className="text-theme-primary font-semibold group-hover:text-[#D37E91] transition-colors">{company.name}</h3>
                    <p className="text-theme-tertiary text-sm">
                      {company.user_count} users • {company.site_count} sites
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score Breakdown */}
                  <div className="hidden lg:flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <div className="text-theme-tertiary mb-1 font-medium">Tasks</div>
                      <div className={`font-semibold ${getEHOScoreColor(company.task_completion_score)}`}>
                        {company.task_completion_score ?? '—'}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-theme-tertiary mb-1 font-medium">SOPs</div>
                      <div className="text-theme-primary font-semibold">{company.sop_count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-theme-tertiary mb-1 font-medium">RAs</div>
                      <div className="text-theme-primary font-semibold">{company.ra_count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-theme-tertiary mb-1 font-medium">Assets</div>
                      <div className="text-theme-primary font-semibold">{company.asset_count}</div>
                    </div>
                  </div>

                  <div className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-module-glow rounded-lg text-sm transition-all duration-200 ease-in-out">
                    View Details
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
