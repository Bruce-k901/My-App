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
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  roles?: string[];
}

// Priority Actions - High frequency daily tasks
const quickActions: QuickAction[] = [
  { id: 'clock', icon: Clock, label: 'Clock In/Out', href: '/dashboard/people/attendance', color: '#FF6B9D' },
  { id: 'incident', icon: AlertTriangle, label: 'Incident', href: '/dashboard/incidents', color: '#f44336' },
  { id: 'temp', icon: Thermometer, label: 'Temp Check', href: '/dashboard/checklists', color: '#2196F3' },
  { id: 'checklist', icon: ClipboardList, label: 'Checklists', href: '/dashboard/checklists', color: '#4CAF50' },
];

// Module-specific actions (Planly removed from mobile - desktop only)
const moduleActions: Record<string, QuickAction[]> = {
  stockly: [
    { id: 'receive', icon: Package, label: 'Receive Delivery', href: '/dashboard/stockly/deliveries', color: '#10B981' },
    { id: 'waste', icon: Trash2, label: 'Record Waste', href: '/dashboard/stockly/waste', color: '#f44336' },
    { id: 'count', icon: CheckSquare, label: 'Stock Count', href: '/dashboard/stockly/stock-counts', color: '#10B981' },
    { id: 'stock', icon: Eye, label: 'View Stock', href: '/dashboard/stockly/stock-items', color: '#10B981' },
  ],
  assetly: [
    { id: 'callout', icon: Wrench, label: 'Place Callout', href: '/dashboard/assets/callout-logs', color: '#f44336' },
    { id: 'assets', icon: Eye, label: 'View Assets', href: '/dashboard/assets', color: '#0EA5E9' },
  ],
  teamly: [
    { id: 'rota', icon: Calendar, label: 'My Rota', href: '/dashboard/people/schedule', color: '#8B5CF6' },
    { id: 'leave', icon: Calendar, label: 'Request Leave', href: '/dashboard/people/leave/request', color: '#8B5CF6' },
    { id: 'directory', icon: Users, label: 'Staff Cards', href: '/dashboard/people/directory', color: '#8B5CF6' },
  ],
};

const settingsActions: QuickAction[] = [
  { id: 'profile', icon: Users, label: 'My Profile', href: '/dashboard/settings', color: '#607D8B' },
  { id: 'help', icon: HelpCircle, label: 'Help', href: '/dashboard/help', color: '#2196F3' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/dashboard/settings', color: '#607D8B' },
];

interface QuickActionsGridProps {
  section: 'quick' | 'stockly' | 'assetly' | 'teamly' | 'settings';
  userRole?: string;
}

export function QuickActionsGrid({ section, userRole }: QuickActionsGridProps) {
  const router = useRouter();
  const { closeMoreSheet } = useMobileNav();

  const actions = section === 'quick' ? quickActions :
                  section === 'settings' ? settingsActions :
                  moduleActions[section] || [];

  const filteredActions = actions.filter(action =>
    !action.roles || (userRole && action.roles.includes(userRole))
  );

  const handleActionClick = (action: QuickAction) => {
    closeMoreSheet();
    router.push(action.href);
  };

  if (filteredActions.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-3">
      {filteredActions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleActionClick(action)}
          className={cn(
            "flex flex-col items-center p-3 rounded-xl",
            "bg-white/5 hover:bg-white/10",
            "transition-all active:scale-95",
            "touch-manipulation"
          )}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-2"
            style={{ backgroundColor: `${action.color}20` }}
          >
            <action.icon size={22} style={{ color: action.color }} />
          </div>
          <span className="text-[11px] font-medium text-center text-gray-400 leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
