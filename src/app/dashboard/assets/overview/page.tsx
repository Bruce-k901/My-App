'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { useSiteFilter } from '@/hooks/useSiteFilter';
import { useAssetlyOverview } from '@/hooks/assetly/useAssetlyOverview';
import { PRIORITY_CONFIG, WO_STATUS_CONFIG } from '@/types/rm';
import type { WOPriority, WOStatus } from '@/types/rm';
import {
  LayoutDashboard,
  Package,
  Users,
  Calendar,
  Layers,
  Wrench,
  Building2,
  ClipboardList,
  DollarSign,
  PhoneCall,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
} from '@/components/ui/icons';

const NAV_SECTIONS = [
  {
    title: 'Equipment Management',
    items: [
      { label: 'All Assets', href: '/dashboard/assets', icon: Package, countKey: 'equipmentCount' as const },
      { label: 'Contractors', href: '/dashboard/assets/contractors', icon: Users },
      { label: 'PPM Schedule', href: '/dashboard/ppm', icon: Calendar },
      { label: 'PPM Groups', href: '/dashboard/assets/groups', icon: Layers },
      { label: 'Callout Logs', href: '/dashboard/assets/callout-logs', icon: PhoneCall },
    ],
  },
  {
    title: 'Repairs & Maintenance',
    items: [
      { label: 'Building Register', href: '/dashboard/assets/rm', icon: Building2, countKey: 'buildingAssetCount' as const },
      { label: 'Work Orders', href: '/dashboard/assets/rm/work-orders', icon: ClipboardList, countKey: 'openWorkOrders' as const },
      { label: 'Inspections', href: '/dashboard/assets/rm/inspections', icon: Calendar },
      { label: 'R&M Costs', href: '/dashboard/assets/rm/costs', icon: DollarSign },
      { label: 'Troubleshoot AI', href: '/dashboard/assets/troubleshoot-setup', icon: Wrench },
    ],
  },
];

export default function AssetlyOverviewPage() {
  const { companyId } = useAppContext();
  const { isAllSites, selectedSiteId } = useSiteFilter();
  const siteId = isAllSites ? null : selectedSiteId;
  const { kpis, recentWOs, upcomingInspections, setupSteps, loading, refresh } = useAssetlyOverview(companyId, siteId);

  const [guideCollapsed, setGuideCollapsed] = useState(false);
  const completedSteps = setupSteps.filter(s => s.completed).length;
  const allComplete = completedSteps === setupSteps.length && setupSteps.length > 0;

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-theme-primary flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-assetly-dark dark:text-assetly" />
          Assetly Overview
        </h1>
        <p className="text-sm text-theme-tertiary mt-1">Equipment assets, building fabric & maintenance at a glance</p>
      </div>

      {/* Setup Guide */}
      {!loading && setupSteps.length > 0 && !allComplete && (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
          <button
            onClick={() => setGuideCollapsed(!guideCollapsed)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-theme-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-assetly-dark/10 dark:bg-assetly/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-assetly-dark dark:text-assetly" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-theme-primary">Setup Guide</h2>
                <p className="text-xs text-theme-tertiary">{completedSteps} of {setupSteps.length} steps complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress bar */}
              <div className="w-24 h-1.5 bg-theme-muted rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-assetly-dark dark:bg-assetly rounded-full transition-all duration-500"
                  style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
                />
              </div>
              {guideCollapsed ? <ChevronRight className="w-4 h-4 text-theme-tertiary" /> : <ChevronDown className="w-4 h-4 text-theme-tertiary" />}
            </div>
          </button>

          {!guideCollapsed && (
            <div className="px-5 pb-4 space-y-1">
              {setupSteps.map((step) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    step.completed
                      ? 'opacity-60 hover:opacity-80'
                      : 'hover:bg-assetly-dark/[0.04] dark:hover:bg-assetly/5'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-theme-tertiary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.completed ? 'text-theme-tertiary line-through' : 'text-theme-primary'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-theme-tertiary truncate">{step.description}</p>
                  </div>
                  {!step.completed && <ArrowRight className="w-4 h-4 text-assetly-dark dark:text-assetly flex-shrink-0" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All-complete banner */}
      {!loading && allComplete && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-700 dark:text-green-400 font-medium">Setup complete</span>
          <span className="text-green-600 dark:text-green-500">— all Assetly modules are configured</span>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-theme-surface border border-theme rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-20 mb-2" />
              <div className="h-7 bg-black/5 dark:bg-white/5 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard
            label="Equipment"
            value={kpis.equipmentCount}
            href="/dashboard/assets"
          />
          <KPICard
            label="Buildings"
            value={kpis.buildingAssetCount}
            href="/dashboard/assets/rm"
          />
          <KPICard
            label="Open WOs"
            value={kpis.openWorkOrders}
            href="/dashboard/assets/rm/work-orders"
            status={kpis.openWorkOrders > 0 ? 'warning' : undefined}
            subText={kpis.openWOByPriority.P1 ? `${kpis.openWOByPriority.P1} P1` : undefined}
          />
          <KPICard
            label="Overdue PPMs"
            value={kpis.overduePPMs}
            href="/dashboard/ppm"
            status={kpis.overduePPMs > 0 ? 'urgent' : undefined}
          />
          <KPICard
            label="Overdue Inspections"
            value={kpis.overdueInspections}
            href="/dashboard/assets/rm/inspections"
            status={kpis.overdueInspections > 0 ? 'urgent' : undefined}
          />
          <KPICard
            label="Monthly Spend"
            value={`\u00A3${kpis.monthlySpend.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            href="/dashboard/assets/rm/costs"
            isText
          />
        </div>
      )}

      {/* Quick Navigation */}
      <div className="space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-assetly-dark/40 dark:text-assetly/40 mb-2 px-1">
              {section.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const count = item.countKey ? kpis[item.countKey] : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 bg-theme-surface border border-theme rounded-xl hover:border-assetly-dark/30 dark:hover:border-assetly/30 hover:bg-assetly-dark/[0.02] dark:hover:bg-assetly/[0.03] transition-colors group"
                  >
                    <Icon className="w-5 h-5 text-assetly-dark dark:text-assetly flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-theme-primary truncate">{item.label}</p>
                      {count !== undefined && !loading && (
                        <p className="text-xs text-theme-tertiary">{count} {count === 1 ? 'item' : 'items'}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {!loading && (recentWOs.length > 0 || upcomingInspections.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Work Orders */}
          <div className="bg-theme-surface border border-theme rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
              <h3 className="text-sm font-semibold text-theme-primary">Recent Work Orders</h3>
              <Link href="/dashboard/assets/rm/work-orders" className="text-xs text-assetly-dark dark:text-assetly hover:underline">
                View all
              </Link>
            </div>
            {recentWOs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <ClipboardList className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
                <p className="text-sm text-theme-tertiary">No work orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-theme">
                {recentWOs.map((wo) => {
                  const priorityCfg = PRIORITY_CONFIG[wo.priority as keyof typeof PRIORITY_CONFIG];
                  const statusCfg = WO_STATUS_CONFIG[wo.status];
                  return (
                    <Link
                      key={wo.id}
                      href="/dashboard/assets/rm/work-orders"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-theme-hover transition-colors"
                    >
                      <span className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${priorityCfg?.bgColour || ''} ${priorityCfg?.colour || 'text-theme-tertiary'}`}>
                        {wo.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-theme-primary truncate">{wo.title}</p>
                        <p className="text-xs text-theme-tertiary">{wo.wo_number} &middot; {new Date(wo.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusCfg?.bgColour || ''} ${statusCfg?.colour || 'text-theme-tertiary'}`}>
                        {statusCfg?.label || wo.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Inspections */}
          <div className="bg-theme-surface border border-theme rounded-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
              <h3 className="text-sm font-semibold text-theme-primary">Upcoming Inspections</h3>
              <Link href="/dashboard/assets/rm/inspections" className="text-xs text-assetly-dark dark:text-assetly hover:underline">
                View all
              </Link>
            </div>
            {upcomingInspections.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Calendar className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
                <p className="text-sm text-theme-tertiary">No upcoming inspections</p>
              </div>
            ) : (
              <div className="divide-y divide-theme">
                {upcomingInspections.map((insp) => (
                  <Link
                    key={insp.id}
                    href="/dashboard/assets/rm/inspections"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-theme-hover transition-colors"
                  >
                    {insp.isOverdue ? (
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-assetly-dark dark:text-assetly flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-theme-primary truncate">{insp.building_asset_name}</p>
                      <p className="text-xs text-theme-tertiary truncate">{insp.description || 'Scheduled inspection'}</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${insp.isOverdue ? 'text-red-500' : 'text-theme-tertiary'}`}>
                      {new Date(insp.next_due_date).toLocaleDateString('en-GB')}
                      {insp.isOverdue && ' (Overdue)'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Card sub-component
function KPICard({ label, value, href, status, subText, isText }: {
  label: string;
  value: number | string;
  href: string;
  status?: 'urgent' | 'warning';
  subText?: string;
  isText?: boolean;
}) {
  return (
    <Link
      href={href}
      className="bg-theme-surface border border-theme rounded-xl p-4 hover:border-assetly-dark/30 dark:hover:border-assetly/30 transition-colors group"
    >
      <p className="text-xs text-theme-tertiary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${
        status === 'urgent' ? 'text-red-500' :
        status === 'warning' ? 'text-amber-500' :
        'text-theme-primary'
      }`}>
        {isText ? value : value}
      </p>
      {subText && (
        <p className="text-xs text-red-500 font-medium mt-0.5">{subText}</p>
      )}
    </Link>
  );
}
