"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, ClipboardList, Search } from '@/components/ui/icons';
import { useWorkOrders } from '@/hooks/assetly/useWorkOrders';
import { PRIORITY_CONFIG, WO_STATUS_CONFIG, OPEN_STATUSES, CLOSED_STATUSES } from '@/types/rm';
import type { WOStatus, WOPriority } from '@/types/rm';
import WorkOrderCard from '@/components/rm/WorkOrderCard';
import WorkOrderModal from '@/components/rm/WorkOrderModal';

type TabFilter = 'all' | 'open' | 'in_progress' | 'completed';

export default function WorkOrdersPage() {
  const { companyId, profile } = useAppContext();
  const { isAllSites, selectedSiteId } = useSiteFilter();
  const { showToast } = useToast();
  const siteId = isAllSites ? null : selectedSiteId;

  const {
    workOrders, loading, fetchWorkOrders,
    createWorkOrder, updateWorkOrderStatus,
    fetchComments, addComment,
  } = useWorkOrders(companyId, siteId);

  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<WOPriority | 'all'>('all');

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleCreateWO = async (data: Parameters<typeof createWorkOrder>[0]) => {
    await createWorkOrder(data, profile?.id || '');
    showToast('Work order created', 'success');
    setShowModal(false);
    await fetchWorkOrders();
  };

  const handleStatusChange = async (woId: string, newStatus: WOStatus) => {
    await updateWorkOrderStatus(woId, newStatus);
    showToast(`Status updated to ${WO_STATUS_CONFIG[newStatus].label}`, 'success');
    await fetchWorkOrders();
  };

  const handleAddComment = async (woId: string, content: string) => {
    await addComment(woId, content, profile?.id || '');
  };

  // Filter
  const filtered = workOrders.filter(wo => {
    // Tab filter
    if (tab === 'open' && !OPEN_STATUSES.includes(wo.status)) return false;
    if (tab === 'in_progress' && wo.status !== 'in_progress') return false;
    if (tab === 'completed' && !CLOSED_STATUSES.includes(wo.status)) return false;

    // Priority filter
    if (priorityFilter !== 'all' && wo.priority !== priorityFilter) return false;

    // Search
    if (search) {
      const s = search.toLowerCase();
      if (
        !wo.title.toLowerCase().includes(s) &&
        !wo.wo_number.toLowerCase().includes(s) &&
        !(wo.asset_name || '').toLowerCase().includes(s) &&
        !(wo.building_asset_name || '').toLowerCase().includes(s) &&
        !(wo.description || '').toLowerCase().includes(s)
      ) return false;
    }

    return true;
  });

  // Stats
  const openCount = workOrders.filter(wo => OPEN_STATUSES.includes(wo.status)).length;
  const inProgressCount = workOrders.filter(wo => wo.status === 'in_progress').length;
  const slaBreachedCount = workOrders.filter(wo => wo.sla_breached && OPEN_STATUSES.includes(wo.status)).length;

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: workOrders.length },
    { key: 'open', label: 'Open', count: openCount },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-assetly-dark dark:text-assetly" />
            Work Orders
          </h1>
          <p className="text-sm text-theme-tertiary mt-1">
            Track and manage maintenance work orders for equipment and building fabric
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black hover:opacity-90 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">Open</p>
          <p className="text-2xl font-bold text-theme-primary">{openCount}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">In Progress</p>
          <p className="text-2xl font-bold text-theme-primary">{inProgressCount}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">SLA Breached</p>
          <p className={`text-2xl font-bold ${slaBreachedCount > 0 ? 'text-red-500' : 'text-theme-primary'}`}>{slaBreachedCount}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-3">
          <p className="text-xs text-theme-tertiary">Total</p>
          <p className="text-2xl font-bold text-theme-primary">{workOrders.length}</p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-theme-muted rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-theme-surface text-theme-primary shadow-sm'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1 text-xs opacity-60">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search WO number, title, asset..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as WOPriority | 'all')}
            className="px-3 py-2 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm"
          >
            <option value="all">All Priorities</option>
            {(Object.keys(PRIORITY_CONFIG) as WOPriority[]).map(p => (
              <option key={p} value={p}>{p} - {PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-assetly-dark dark:border-assetly" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-medium text-theme-primary mb-1">
            {workOrders.length === 0 ? 'No work orders yet' : 'No matching work orders'}
          </h3>
          <p className="text-sm text-theme-tertiary mb-4">
            {workOrders.length === 0
              ? 'Create your first work order to start tracking maintenance.'
              : 'Try adjusting your search or filters.'}
          </p>
          {workOrders.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-assetly-dark dark:bg-assetly text-white dark:text-black"
            >
              New Work Order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(wo => (
            <WorkOrderCard
              key={wo.id}
              workOrder={wo}
              onStatusChange={handleStatusChange}
              onAddComment={handleAddComment}
              fetchComments={fetchComments}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <WorkOrderModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreateWO}
      />
    </div>
  );
}
