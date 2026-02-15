"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Search, 
  Eye, 
  Users, 
  ClipboardList,
  Calendar,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from '@/components/ui/icons';

interface CompanyWithStats {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  task_count: number;
  completed_today: number;
  pending_today: number;
  last_activity: string | null;
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with stats
      const enriched = await Promise.all(
        (companiesData || []).map(async (company) => {
          const today = new Date().toISOString().split('T')[0];
          
          const [
            { count: userCount },
            { count: taskCount },
            { count: completedToday },
            { count: pendingToday },
            { data: lastActivity }
          ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'completed').gte('completed_at', today),
            supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending').eq('due_date', today),
            supabase.from('profiles').select('last_login').eq('company_id', company.id).order('last_login', { ascending: false, nullsFirst: false }).limit(1)
          ]);

          return {
            ...company,
            user_count: userCount || 0,
            task_count: taskCount || 0,
            completed_today: completedToday || 0,
            pending_today: pendingToday || 0,
            last_activity: lastActivity?.[0]?.last_login || null
          };
        })
      );

      setCompanies(enriched);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleViewAs = (company: CompanyWithStats) => {
    // Store company in session for "View As" mode
    sessionStorage.setItem('admin_viewing_as_company', JSON.stringify({
      id: company.id,
      name: company.name
    }));
    
    // Redirect to customer dashboard
    router.push('/dashboard');
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthIndicator = (company: CompanyWithStats) => {
    // Simple health check based on activity
    if (!company.last_activity) return { color: 'gray', label: 'No activity' };
    
    const lastActive = new Date(company.last_activity);
    const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive <= 1) return { color: 'green', label: 'Active' };
    if (daysSinceActive <= 7) return { color: 'yellow', label: 'Recent' };
    return { color: 'red', label: 'Inactive' };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Companies</h1>
          <p className="text-theme-tertiary">Manage and monitor all registered companies</p>
        </div>
        <div className="text-theme-tertiary text-sm">
          {companies.length} total companies
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-5 h-5" />
        <input
          type="text"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/40 focus:border-[#D37E91]/40"
        />
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        {filteredCompanies.map((company) => {
          const health = getHealthIndicator(company);
          const healthColors = {
            green: 'bg-green-500/10 text-green-400 border-green-500/20',
            yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            red: 'bg-red-500/10 text-red-400 border-red-500/20',
            gray: 'bg-theme-surface-elevated0/10 text-theme-tertiary border-gray-500/20'
          };

          return (
            <div
              key={company.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D37E91]/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#D37E91]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-theme-primary">{company.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${healthColors[health.color]}`}>
                        {health.label}
                      </span>
                    </div>
                    <div className="text-theme-tertiary text-sm flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(company.created_at).toLocaleDateString()}
                      </span>
                      {company.last_activity && (
                        <span>
                          Last active: {new Date(company.last_activity).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-theme-primary">
                        <Users className="w-4 h-4 text-theme-tertiary" />
                        <span className="font-semibold">{company.user_count}</span>
                      </div>
                      <div className="text-theme-tertiary text-xs">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-theme-primary">
                        <ClipboardList className="w-4 h-4 text-theme-tertiary" />
                        <span className="font-semibold">{company.task_count}</span>
                      </div>
                      <div className="text-theme-tertiary text-xs">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-semibold">{company.completed_today}</span>
                      </div>
                      <div className="text-theme-tertiary text-xs">Done Today</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-yellow-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold">{company.pending_today}</span>
                      </div>
                      <div className="text-theme-tertiary text-xs">Pending</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewAs(company)}
                      className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg text-sm font-medium transition-all duration-200 ease-in-out"
                    >
                      <Eye className="w-4 h-4" />
                      View As
                    </button>
                    <button
                      onClick={() => router.push(`/admin/companies/${company.id}`)}
                      className="p-2 hover:bg-white/[0.1] rounded-lg text-theme-tertiary hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-theme-tertiary">
              {searchTerm ? 'No companies match your search' : 'No companies registered yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

