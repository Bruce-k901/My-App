'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Pin, Plus, X } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

type SidebarTab = 'feed' | 'incidents';

interface FeedItem {
  id: string;
  title: string;
  time: string;
  severity: 'urgent' | 'warning' | 'good' | 'neutral';
  module: string;
}

interface Incident {
  id: string;
  title: string;
  location: string;
  time: string;
  status: 'open' | 'investigating' | 'resolved';
}

const SEVERITY_COLORS = {
  urgent: 'bg-checkly',
  warning: 'bg-teamly',
  good: 'bg-stockly',
  neutral: 'bg-black/40 dark:bg-white/40',
};

const STATUS_COLORS = {
  open: { text: 'text-checkly', bg: 'bg-checkly/10' },
  investigating: { text: 'text-teamly', bg: 'bg-teamly/10' },
  resolved: { text: 'text-stockly', bg: 'bg-stockly/10' },
};

/**
 * FeedItemComponent - Single item in activity feed
 */
function FeedItemComponent({ item }: { item: FeedItem }) {
  return (
    <div className="flex gap-2.5 py-2.5 border-b border-module-fg/[0.12]">
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
          SEVERITY_COLORS[item.severity]
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] text-[rgb(var(--text-secondary))] leading-tight">{item.title}</div>
        <div className="flex items-center gap-1 text-[10px] text-[rgb(var(--text-disabled))] mt-0.5">
          <Clock className="w-3 h-3" />
          {item.time}
        </div>
      </div>
    </div>
  );
}

/**
 * IncidentItemComponent - Single incident card
 */
function IncidentItemComponent({ incident }: { incident: Incident }) {
  const statusColor = STATUS_COLORS[incident.status];

  return (
    <Link
      href={`/dashboard/incidents/${incident.id}`}
      className="block p-2.5 bg-[rgb(var(--surface))] dark:bg-[#1e1a17] rounded-md border border-module-fg/[0.12] mb-1.5 hover:border-[rgb(var(--border-hover))] transition-colors"
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[11.5px] text-[rgb(var(--text-secondary))] font-medium truncate pr-2">
          {incident.title}
        </span>
        <span
          className={cn(
            'text-[9px] font-semibold uppercase tracking-[0.05em] px-1.5 py-0.5 rounded flex-shrink-0',
            statusColor.text,
            statusColor.bg
          )}
        >
          {incident.status}
        </span>
      </div>
      <div className="text-[10px] text-[rgb(var(--text-disabled))]">
        {incident.location} · {incident.time}
      </div>
    </Link>
  );
}

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * DashboardSidebar - Pinned right sidebar with Activity Feed and Incidents
 *
 * Features:
 * - Two tabs: Activity Feed and Incidents
 * - Always visible to all roles (not customizable)
 * - Real-time updates for incidents
 * - Desktop: Fixed 280px width
 * - Mobile: Full-screen overlay when open
 */
export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const { companyId, siteId } = useAppContext();
  const [activeTab, setActiveTab] = useState<SidebarTab>('feed');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Fetch activity feed (simplified - just Checkly events for v1)
  useEffect(() => {
    if (!companyId) return;

    async function fetchFeed() {
      try {
        // Get recent checklist completions and overdue checks
        const { data: tasks, error } = await supabase
          .from('checklist_tasks')
          .select('id, status, completed_at, due_date, due_time, custom_name, template:task_templates(name)')
          .eq('company_id', companyId)
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(10);

        if (error && error.code !== '42P01') {
          console.error('Error fetching feed:', error);
        }

        const items: FeedItem[] = (tasks || []).map((task: any) => {
          const isOverdue = task.status !== 'completed' && new Date(task.due_date) < new Date();
          const name = task.custom_name || task.template?.name || 'Task';

          return {
            id: task.id,
            title: task.status === 'completed'
              ? `${name} completed`
              : isOverdue
              ? `${name} is overdue`
              : `${name} pending`,
            time: formatRelativeTime(task.completed_at || task.due_date),
            severity: task.status === 'completed' ? 'good' : isOverdue ? 'urgent' : 'neutral',
            module: 'checkly',
          };
        });

        setFeedItems(items);
      } catch (err) {
        console.error('Error fetching feed:', err);
      }
    }

    fetchFeed();
  }, [companyId]);

  // Fetch incidents
  useEffect(() => {
    if (!companyId) return;

    async function fetchIncidents() {
      try {
        setLoading(true);

        let query = supabase
          .from('incidents')
          .select('id, title, incident_type, status, severity, created_at, site_id')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('incidents table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedIncidents: Incident[] = (data || []).map((inc: any) => ({
          id: inc.id,
          title: inc.title || inc.incident_type || 'Incident',
          location: 'Site',
          time: formatRelativeTime(inc.created_at),
          status: inc.status as Incident['status'],
        }));

        setIncidents(formattedIncidents);

        // Count open incidents
        const open = formattedIncidents.filter(
          (i) => i.status === 'open' || i.status === 'investigating'
        ).length;
        setOpenCount(open);
      } catch (err) {
        console.error('Error fetching incidents:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIncidents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('incidents-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, siteId]);

  // Separate open and resolved incidents
  const openIncidents = incidents.filter(
    (i) => i.status === 'open' || i.status === 'investigating'
  );
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved').slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="w-72 border-l border-module-fg/[0.12] bg-[rgb(var(--surface-elevated))] dark:bg-[#1a1714] flex flex-col overflow-hidden h-full">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-primary))] lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-module-fg/[0.12] flex-shrink-0">
        <button
          onClick={() => setActiveTab('feed')}
          className={cn(
            'flex-1 py-2.5 px-2.5 text-[11.5px] font-semibold transition-all border-b-2',
            activeTab === 'feed'
              ? 'border-checkly text-[rgb(var(--text-primary))]'
              : 'border-transparent text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-secondary))]'
          )}
        >
          Activity Feed
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={cn(
            'flex-1 py-2.5 px-2.5 text-[11.5px] font-semibold transition-all border-b-2 flex items-center justify-center gap-1.5',
            activeTab === 'incidents'
              ? 'border-checkly text-[rgb(var(--text-primary))]'
              : 'border-transparent text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-secondary))]'
          )}
        >
          Incidents
          {openCount > 0 && (
            <span className="bg-checkly/20 text-checkly text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
              {openCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3.5">
        {activeTab === 'feed' ? (
          <>
            {feedItems.length === 0 ? (
              <div className="text-center text-[rgb(var(--text-disabled))] text-xs py-8">
                No recent activity
              </div>
            ) : (
              feedItems.map((item) => <FeedItemComponent key={item.id} item={item} />)
            )}
          </>
        ) : (
          <>
            {/* Open Incidents */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgb(var(--text-disabled))]">
                  Open
                </span>
                {openCount > 0 && (
                  <span className="bg-checkly/10 text-checkly text-[9px] font-semibold px-2 py-0.5 rounded-full">
                    {openCount}
                  </span>
                )}
              </div>
              {openIncidents.length === 0 ? (
                <div className="text-[rgb(var(--text-disabled))] text-xs py-4 text-center">No open incidents</div>
              ) : (
                openIncidents.map((incident) => (
                  <IncidentItemComponent key={incident.id} incident={incident} />
                ))
              )}
            </div>

            {/* Recently Resolved */}
            {resolvedIncidents.length > 0 && (
              <div className="mb-4">
                <div className="mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[rgb(var(--text-disabled))]">
                    Recently Resolved
                  </span>
                </div>
                {resolvedIncidents.map((incident) => (
                  <IncidentItemComponent key={incident.id} incident={incident} />
                ))}
              </div>
            )}

            {/* Report New Incident button */}
            <Link
              href="/dashboard/incidents/new"
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-2 px-3',
                'bg-checkly/10 border border-checkly/30 rounded-md',
                'text-checkly text-[11px] font-medium',
                'hover:bg-checkly/20 transition-colors'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Report New Incident
            </Link>
          </>
        )}
      </div>

      {/* Pinned indicator footer */}
      <div className="px-3.5 py-2 border-t border-module-fg/[0.12] bg-black/[0.03] dark:bg-[#131110] flex items-center gap-1.5 flex-shrink-0">
        <Pin className="w-2.5 h-2.5 text-[rgb(var(--text-disabled))]" />
        <span className="text-[9px] text-[rgb(var(--text-disabled))]">Pinned — visible to all staff</span>
      </div>
    </div>
  );
}

export default DashboardSidebar;
