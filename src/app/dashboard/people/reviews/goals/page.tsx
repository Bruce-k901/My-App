'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Target, Plus, Calendar, TrendingUp } from '@/components/ui/icons';
import type { GoalView } from '@/types/teamly';

export default function GoalsPage() {
  const { profile } = useAppContext();
  const [goals, setGoals] = useState<GoalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  
  const isManager = profile?.app_role && ['admin', 'owner', 'manager'].includes(profile.app_role.toLowerCase());

  useEffect(() => {
    if (profile?.id) {
      fetchGoals();
    }
  }, [profile?.id, filter, viewMode]);

  const fetchGoals = async () => {
    setLoading(true);
    
    let query = supabase.from('goals_view').select('*');
    
    if (viewMode === 'my') {
      query = query.eq('profile_id', profile?.id);
    } else {
      // Team goals - get direct reports
      const { data: reports } = await supabase
        .from('profiles')
        .select('id')
        .eq('reports_to', profile?.id);
      
      const reportIds = reports?.map(r => r.id) || [];
      query = query.in('profile_id', [...reportIds, profile?.id]);
    }
    
    if (filter === 'active') {
      query = query.not('status', 'in', '("completed","cancelled")');
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }
    
    const { data } = await query.order('target_date');
    setGoals(data || []);
    setLoading(false);
  };

  const updateProgress = async (goalId: string, progress: number) => {
    await supabase
      .from('goals')
      .update({ 
        progress_percentage: progress,
        status: progress >= 100 ? 'completed' : 'in_progress',
        completed_date: progress >= 100 ? new Date().toISOString() : null,
      })
      .eq('id', goalId);
    
    fetchGoals();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default: return 'bg-white/[0.05] text-gray-500 dark:text-white/60 border border-gray-200 dark:border-white/[0.06]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'overdue': return 'text-red-400';
      case 'due_soon': return 'text-amber-400';
      default: return 'text-gray-500 dark:text-white/60';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D37E91]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals</h1>
          <p className="text-gray-500 dark:text-white/60">Track objectives and key results</p>
        </div>
        <Link
          href="/dashboard/people/reviews/goals/new"
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all duration-200 ease-in-out"
        >
          <Plus className="w-5 h-5" />
          New Goal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {isManager && (
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.06]">
            <button
              onClick={() => setViewMode('my')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'my' 
                  ? 'bg-transparent border border-[#D37E91] text-[#D37E91]' 
                  : 'bg-white dark:bg-white/[0.03] text-gray-500 dark:text-white/60 hover:text-gray-900 dark:text-white'
              }`}
            >
              My Goals
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 text-sm transition-colors ${
                viewMode === 'team' 
                  ? 'bg-transparent border border-[#D37E91] text-[#D37E91]' 
                  : 'bg-white dark:bg-white/[0.03] text-gray-500 dark:text-white/60 hover:text-gray-900 dark:text-white'
              }`}
            >
              Team Goals
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          {(['active', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === f 
                  ? 'bg-transparent border border-[#D37E91] text-[#D37E91]' 
                  : 'bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/60 hover:text-gray-900 dark:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-12 text-center">
            <Target className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium">No goals found</p>
            <p className="text-gray-500 dark:text-white/60 text-sm mt-1">Create a goal to start tracking your objectives</p>
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.goal_id}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/dashboard/people/reviews/goals/${goal.goal_id}`}
                      className="text-gray-900 dark:text-white font-medium hover:text-[#D37E91] transition-colors"
                    >
                      {goal.title}
                    </Link>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(goal.priority)}`}>
                      {goal.priority}
                    </span>
                  </div>
                  
                  {goal.description && (
                    <p className="text-gray-500 dark:text-white/60 text-sm mb-3 line-clamp-2">{goal.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    {viewMode === 'team' && goal.profile_id !== profile?.id && (
                      <span className="text-neutral-500">{goal.employee_name}</span>
                    )}
                    <span className="text-neutral-500 capitalize">{goal.goal_type}</span>
                    {goal.target_date && (
                      <span className={getStatusColor(goal.display_status)}>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(goal.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {goal.update_count > 0 && (
                      <span className="text-neutral-500">
                        {goal.update_count} update{goal.update_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="w-32 flex-shrink-0">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-white/60">Progress</span>
                    <span className="text-gray-900 dark:text-white font-medium">{goal.progress_percentage}%</span>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        goal.progress_percentage >= 100 ? 'bg-green-500' : 'bg-[#D37E91]'
                      }`}
                      style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    />
                  </div>
                  
                  {/* Quick progress buttons */}
                  {goal.status !== 'completed' && goal.profile_id === profile?.id && (
                    <div className="flex gap-1 mt-2">
                      {[25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          onClick={(e) => {
                            e.preventDefault();
                            updateProgress(goal.goal_id, p);
                          }}
                          className={`flex-1 py-1 text-xs rounded transition-colors ${
                            goal.progress_percentage >= p 
                              ? 'bg-[#D37E91]/20 text-[#D37E91] border border-[#D37E91]/30' 
                              : 'bg-white/[0.05] text-gray-500 dark:text-white/60 hover:bg-white/[0.1] border border-gray-200 dark:border-white/[0.06]'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

