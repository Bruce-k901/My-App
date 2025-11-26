"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  AlertCircle,
  TrendingUp,
  Loader2,
  ArrowRight,
  FileText,
  ShieldAlert,
  Wrench,
  MessageSquare,
  Phone,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  completed_tasks: number;
  missed_tasks: number;
  tasks_created_today: number;
  tasks_completed_today: number;
  total_completion_records: number;
  completions_today: number;
  completions_this_week: number;
  active_templates: number;
  library_templates: number;
  custom_templates: number;
  total_sops: number;
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
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companiesWithEHO, setCompaniesWithEHO] = useState<CompanyWithEHO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllStats, setShowAllStats] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch platform stats from the view
      const { data: statsData, error: statsError } = await supabase
        .from('admin_platform_stats')
        .select('*')
        .single();

      if (statsError) {
        console.error('Error fetching stats:', statsError);
        // Fallback to manual queries
        await fetchStatsFallback();
      } else {
        setStats(statsData);
      }

      // Try to fetch companies with EHO scores
      const { data: ehoData, error: ehoError } = await supabase
        .from('admin_company_eho_scores')
        .select('*')
        .order('eho_score', { ascending: true, nullsFirst: false })
        .limit(10);

      if (!ehoError && ehoData) {
        setCompaniesWithEHO(ehoData);
      } else {
        // Fallback: fetch companies without EHO scores
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (companies) {
          const enriched = await Promise.all(
            companies.map(async (company) => {
              const [users, tasks, sops, ras, assets] = await Promise.all([
                supabase.from('profiles').select('id').eq('company_id', company.id),
                supabase.from('checklist_tasks').select('id').eq('company_id', company.id),
                supabase.from('sop_entries').select('id').eq('company_id', company.id),
                supabase.from('risk_assessments').select('id').eq('company_id', company.id),
                supabase.from('assets').select('id').eq('company_id', company.id)
              ]);
              return {
                ...company,
                user_count: users.data?.length || 0,
                site_count: 0,
                task_count: tasks.data?.length || 0,
                sop_count: sops.data?.length || 0,
                ra_count: ras.data?.length || 0,
                asset_count: assets.data?.length || 0,
                eho_score: null,
                task_completion_score: null,
                sop_coverage_score: null,
                ra_coverage_score: null,
                asset_compliance_score: null,
                eho_details: null
              };
            })
          );
          setCompaniesWithEHO(enriched);
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStatsFallback() {
    const [companiesRes, usersRes, tasksRes, sopsRes, rasRes, assetsRes, messagesRes] = await Promise.all([
      supabase.from('companies').select('id, created_at'),
      supabase.from('profiles').select('id, last_login'),
      supabase.from('checklist_tasks').select('id, status, completed_at, created_at'),
      supabase.from('sop_entries').select('id, created_at'),
      supabase.from('risk_assessments').select('id, status, next_review_date'),
      supabase.from('assets').select('id, status, next_service_date'),
      supabase.from('messaging_messages').select('id, created_at')
    ]);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    setStats({
      total_companies: companiesRes.data?.length || 0,
      new_companies_this_week: companiesRes.data?.filter(c => new Date(c.created_at) > weekAgo).length || 0,
      new_companies_this_month: companiesRes.data?.filter(c => new Date(c.created_at) > monthAgo).length || 0,
      total_users: usersRes.data?.length || 0,
      active_users_today: usersRes.data?.filter(u => u.last_login && new Date(u.last_login) > dayAgo).length || 0,
      active_users_this_week: usersRes.data?.filter(u => u.last_login && new Date(u.last_login) > weekAgo).length || 0,
      platform_admins: 0,
      total_sites: 0,
      total_tasks: tasksRes.data?.length || 0,
      pending_tasks: tasksRes.data?.filter(t => t.status === 'pending').length || 0,
      completed_tasks: tasksRes.data?.filter(t => t.status === 'completed').length || 0,
      missed_tasks: tasksRes.data?.filter(t => t.status === 'missed').length || 0,
      tasks_created_today: tasksRes.data?.filter(t => new Date(t.created_at) > dayAgo).length || 0,
      tasks_completed_today: tasksRes.data?.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) > dayAgo).length || 0,
      total_completion_records: 0,
      completions_today: 0,
      completions_this_week: 0,
      active_templates: 0,
      library_templates: 0,
      custom_templates: 0,
      total_sops: sopsRes.data?.length || 0,
      sops_created_this_month: sopsRes.data?.filter(s => new Date(s.created_at) > monthAgo).length || 0,
      total_risk_assessments: rasRes.data?.length || 0,
      active_risk_assessments: rasRes.data?.filter(r => r.status === 'Active').length || 0,
      overdue_risk_assessments: rasRes.data?.filter(r => r.next_review_date && new Date(r.next_review_date) <= now).length || 0,
      total_assets: assetsRes.data?.length || 0,
      active_assets: assetsRes.data?.filter(a => a.status === 'active').length || 0,
      overdue_service_assets: assetsRes.data?.filter(a => a.next_service_date && new Date(a.next_service_date) <= now).length || 0,
      total_messages: messagesRes.data?.length || 0,
      messages_today: messagesRes.data?.filter(m => new Date(m.created_at) > dayAgo).length || 0,
      messages_this_week: messagesRes.data?.filter(m => new Date(m.created_at) > weekAgo).length || 0,
      total_channels: 0,
      total_callouts: 0,
      open_callouts: 0,
      callouts_this_week: 0
    });
  }

  function getEHOScoreColor(score: number | null): string {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function getEHOScoreBg(score: number | null): string {
    if (score === null) return 'bg-gray-500/10';
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    if (score >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#EC4899] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
        <p className="text-white/60">Monitor all Checkly customers and platform health</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-[#EC4899]/10 rounded-lg">
              <Building2 className="w-5 h-5 text-[#EC4899]" />
            </div>
            {stats?.new_companies_this_week && stats.new_companies_this_week > 0 && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                +{stats.new_companies_this_week} this week
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stats?.total_companies || 0}</div>
          <div className="text-sm text-white/60">Total Companies</div>
        </div>

        {/* Total Users */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            {stats?.active_users_today && stats.active_users_today > 0 && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                {stats.active_users_today} today
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stats?.total_users || 0}</div>
          <div className="text-sm text-white/60">Total Users</div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-yellow-500/10 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-yellow-400" />
            </div>
            {stats?.tasks_completed_today && stats.tasks_completed_today > 0 && (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                {stats.tasks_completed_today} done today
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stats?.pending_tasks || 0}</div>
          <div className="text-sm text-white/60">Pending Tasks</div>
        </div>

        {/* Missed Tasks */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stats?.missed_tasks || 0}</div>
          <div className="text-sm text-white/60">Missed Tasks</div>
        </div>
      </div>

      {/* Secondary Stats - SOPs, RAs, Assets, Messages */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* SOPs */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white/60">SOPs</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_sops || 0}</div>
          {stats?.sops_created_this_month && stats.sops_created_this_month > 0 && (
            <div className="text-xs text-purple-400 mt-1">+{stats.sops_created_this_month} this month</div>
          )}
        </div>

        {/* Risk Assessments */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-white/60">Risk Assessments</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_risk_assessments || 0}</div>
          {stats?.overdue_risk_assessments && stats.overdue_risk_assessments > 0 && (
            <div className="text-xs text-red-400 mt-1">{stats.overdue_risk_assessments} overdue</div>
          )}
        </div>

        {/* Assets */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-white/60">Assets</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_assets || 0}</div>
          {stats?.overdue_service_assets && stats.overdue_service_assets > 0 && (
            <div className="text-xs text-red-400 mt-1">{stats.overdue_service_assets} need service</div>
          )}
        </div>

        {/* Messages */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/60">Messages</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_messages || 0}</div>
          {stats?.messages_today && stats.messages_today > 0 && (
            <div className="text-xs text-green-400 mt-1">{stats.messages_today} today</div>
          )}
        </div>

        {/* Callouts */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-red-400" />
            <span className="text-xs text-white/60">Callouts</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_callouts || 0}</div>
          {stats?.open_callouts && stats.open_callouts > 0 && (
            <div className="text-xs text-yellow-400 mt-1">{stats.open_callouts} open</div>
          )}
        </div>

        {/* Sites */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-white/60">Sites</span>
          </div>
          <div className="text-xl font-bold text-white">{stats?.total_sites || 0}</div>
        </div>
      </div>

      {/* Expand/Collapse for more stats */}
      <button
        onClick={() => setShowAllStats(!showAllStats)}
        className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
      >
        {showAllStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAllStats ? 'Show less' : 'Show more stats'}
      </button>

      {showAllStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Total Tasks</div>
            <div className="text-lg font-semibold text-white">{stats?.total_tasks || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Completed Tasks</div>
            <div className="text-lg font-semibold text-green-400">{stats?.completed_tasks || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Completions Today</div>
            <div className="text-lg font-semibold text-white">{stats?.completions_today || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Active Templates</div>
            <div className="text-lg font-semibold text-white">{stats?.active_templates || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Library Templates</div>
            <div className="text-lg font-semibold text-white">{stats?.library_templates || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Custom Templates</div>
            <div className="text-lg font-semibold text-white">{stats?.custom_templates || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Active Users (Week)</div>
            <div className="text-lg font-semibold text-white">{stats?.active_users_this_week || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Messages (Week)</div>
            <div className="text-lg font-semibold text-white">{stats?.messages_this_week || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Callouts (Week)</div>
            <div className="text-lg font-semibold text-white">{stats?.callouts_this_week || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Active RAs</div>
            <div className="text-lg font-semibold text-white">{stats?.active_risk_assessments || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Active Assets</div>
            <div className="text-lg font-semibold text-white">{stats?.active_assets || 0}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
            <div className="text-xs text-white/50 mb-1">Message Channels</div>
            <div className="text-lg font-semibold text-white">{stats?.total_channels || 0}</div>
          </div>
        </div>
      )}

      {/* Companies with EHO Readiness Scores */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EC4899]/10 rounded-lg">
              <Award className="w-5 h-5 text-[#EC4899]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">EHO Readiness Scores</h2>
              <p className="text-sm text-white/60">Companies ranked by compliance readiness</p>
            </div>
          </div>
          <Link 
            href="/admin/companies" 
            className="text-[#EC4899] hover:text-[#EC4899]/80 text-sm flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {companiesWithEHO.length === 0 ? (
          <p className="text-white/60 text-center py-8">No companies yet</p>
        ) : (
          <div className="space-y-3">
            {companiesWithEHO.map((company) => (
              <div 
                key={company.id}
                className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* EHO Score Badge */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${getEHOScoreBg(company.eho_score)}`}>
                    <span className={`text-lg font-bold ${getEHOScoreColor(company.eho_score)}`}>
                      {company.eho_score !== null ? company.eho_score : '—'}
                    </span>
                    <span className="text-[10px] text-white/50">EHO</span>
                  </div>
                  
                  <div>
                    <h3 className="text-white font-medium">{company.name}</h3>
                    <p className="text-white/60 text-sm">
                      {company.user_count} users • {company.site_count} sites
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score Breakdown */}
                  <div className="hidden lg:flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-white/40 mb-1">Tasks</div>
                      <div className={getEHOScoreColor(company.task_completion_score)}>
                        {company.task_completion_score ?? '—'}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/40 mb-1">SOPs</div>
                      <div className="text-white">{company.sop_count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/40 mb-1">RAs</div>
                      <div className="text-white">{company.ra_count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/40 mb-1">Assets</div>
                      <div className="text-white">{company.asset_count}</div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="px-3 py-1.5 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded-lg text-sm transition-all duration-200 ease-in-out"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
