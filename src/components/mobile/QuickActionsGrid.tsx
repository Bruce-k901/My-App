'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Thermometer,
  Package,
  AlertTriangle,
  CheckSquare,
  Wrench,
  ClipboardList,
  Trash2,
  Users,
  Calendar,
  HelpCircle,
  Settings,
  Eye,
  MessageSquare,
  Send,
  FileText,
  Shield,
  type LucideIcon
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';
import { usePanelStore } from '@/lib/stores/panel-store';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  roles?: string[];
}

// Priority Actions - High frequency daily tasks (Checklists removed - Tasks tab covers this)
const quickActions: QuickAction[] = [
  { id: 'clock', icon: Clock, label: 'Clock In/Out', href: '/dashboard/people/attendance', color: '#FF6B9D' },
  { id: 'incident', icon: AlertTriangle, label: 'Incident', href: '/dashboard/incidents', color: '#f44336' },
  { id: 'temp', icon: Thermometer, label: 'Temp Check', href: '/dashboard/todays_tasks', color: '#2196F3' },
];

// Module-specific actions (Planly removed from mobile - desktop only)
const moduleActions: Record<string, QuickAction[]> = {
  checkly: [
    { id: 'sops', icon: FileText, label: 'SOPs', href: '/dashboard/sops/list', color: '#F1E194' },
    { id: 'risk-assessments', icon: Shield, label: 'Risk Assessments', href: '/dashboard/risk-assessments', color: '#F1E194' },
  ],
  stockly: [
    { id: 'receive', icon: Package, label: 'Receive Delivery', href: '/dashboard/stockly/deliveries', color: '#10B981' },
    { id: 'waste', icon: Trash2, label: 'Record Waste', href: '/dashboard/stockly/waste', color: '#f44336' },
    { id: 'count', icon: CheckSquare, label: 'Stock Count', href: '/dashboard/stockly/stock-counts', color: '#10B981' },
    { id: 'stock', icon: Eye, label: 'View Stock', href: '/dashboard/stockly/stock-items', color: '#10B981' },
    { id: 'suppliers', icon: Package, label: 'Suppliers', href: '/dashboard/stockly/suppliers', color: '#10B981' },
  ],
  assetly: [
    { id: 'callout', icon: Wrench, label: 'Place Callout', href: '/dashboard/assets/callout-logs', color: '#f44336' },
    { id: 'report-issue', icon: Wrench, label: 'Report Issue', href: '/dashboard/assets/rm/work-orders', color: '#f44336' },
    { id: 'assets', icon: Eye, label: 'View Assets', href: '/dashboard/assets', color: '#0EA5E9' },
    { id: 'contractors', icon: Wrench, label: 'Contractors', href: '/dashboard/assets/contractors', color: '#0EA5E9' },
  ],
  teamly: [
    { id: 'leave', icon: Calendar, label: 'Request Leave', href: '/dashboard/people/leave/request', color: '#8B5CF6' },
    { id: 'directory', icon: Users, label: 'Staff Cards', href: '/dashboard/people/directory', color: '#8B5CF6' },
  ],
  msgly: [
    { id: 'messages', icon: MessageSquare, label: 'Messages', href: '/dashboard/messaging', color: '#F59E0B' },
    { id: 'new-message', icon: Send, label: 'New Message', href: '/dashboard/messaging?new=true', color: '#F59E0B' },
  ],
};

const settingsActions: QuickAction[] = [
  { id: 'profile', icon: Users, label: 'My Profile', href: '/dashboard/settings', color: '#607D8B' },
  { id: 'help', icon: HelpCircle, label: 'Help', href: '/dashboard/help', color: '#2196F3' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings', color: '#607D8B' },
];

interface QuickActionsGridProps {
  section: 'quick' | 'checkly' | 'stockly' | 'assetly' | 'teamly' | 'msgly' | 'settings';
  userRole?: string;
}

export function QuickActionsGrid({ section, userRole }: QuickActionsGridProps) {
  const router = useRouter();
  const { closeMoreSheet } = useMobileNav();
  const { setMessagingOpen } = usePanelStore();

  const actions = section === 'quick' ? quickActions :
                  section === 'settings' ? settingsActions :
                  moduleActions[section] || [];

  const filteredActions = actions.filter(action =>
    !action.roles || (userRole && action.roles.includes(userRole))
  );

  const handleActionClick = (action: QuickAction) => {
    closeMoreSheet();
    // Open messaging panel directly instead of navigating
    if (action.href.startsWith('/dashboard/messaging')) {
      setMessagingOpen(true);
      return;
    }
    router.push(action.href);
  };

  if (filteredActions.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2">
      {filteredActions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleActionClick(action)}
          className={cn(
            "flex flex-col items-center p-2 rounded-xl",
            "bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.14]",
            "border border-gray-200/60 dark:border-white/[0.08]",
            "transition-all active:scale-95",
            "touch-manipulation"
          )}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
            style={{ backgroundColor: `${action.color}25` }}
          >
            <action.icon size={20} style={{ color: action.color }} />
          </div>
          <span className="text-[11px] font-medium text-center text-theme-secondary leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
