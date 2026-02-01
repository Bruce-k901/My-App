'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Thermometer,
  Package,
  AlertTriangle,
  CheckSquare,
  Truck,
  Wrench,
  ClipboardList,
  Trash2,
  Users,
  Calendar,
  HelpCircle,
  Settings,
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
  roles?: string[]; // If specified, only show for these roles
}

const quickActions: QuickAction[] = [
  // High Priority - Show for all
  { id: 'clock', icon: Clock, label: 'Clock In/Out', href: '/mobile/clock', color: '#FF6B9D' },
  { id: 'incident', icon: AlertTriangle, label: 'Incident', href: '/mobile/incident', color: '#f44336' },
  { id: 'temp', icon: Thermometer, label: 'Temp Check', href: '/checkly/temperatures', color: '#2196F3' },
  { id: 'checklist', icon: ClipboardList, label: 'Checklists', href: '/checkly/checklists', color: '#4CAF50' },
];

const moduleActions: Record<string, QuickAction[]> = {
  stockly: [
    { id: 'receive', icon: Package, label: 'Receive Delivery', href: '/stockly/deliveries/receive', color: '#FF9800' },
    { id: 'waste', icon: Trash2, label: 'Record Waste', href: '/stockly/waste', color: '#f44336' },
    { id: 'count', icon: CheckSquare, label: 'Quick Count', href: '/stockly/counts/quick', color: '#9C27B0' },
    { id: 'stock', icon: Package, label: 'View Stock', href: '/stockly/stock', color: '#607D8B' },
  ],
  planly: [
    { id: 'production', icon: ClipboardList, label: 'Production', href: '/planly/production', color: '#FF9800' },
    { id: 'deliveries', icon: Truck, label: 'Deliveries', href: '/planly/deliveries', color: '#4CAF50' },
  ],
  assetly: [
    { id: 'callout', icon: Wrench, label: 'Place Callout', href: '/assetly/callouts/new', color: '#f44336' },
    { id: 'assets', icon: Wrench, label: 'View Assets', href: '/assetly/assets', color: '#607D8B' },
  ],
  teamly: [
    { id: 'rota', icon: Calendar, label: 'My Rota', href: '/teamly/rota', color: '#9C27B0' },
    { id: 'leave', icon: Calendar, label: 'Request Leave', href: '/teamly/leave', color: '#2196F3' },
    { id: 'directory', icon: Users, label: 'Staff Cards', href: '/teamly/directory', color: '#4CAF50' },
  ],
};

const settingsActions: QuickAction[] = [
  { id: 'profile', icon: Users, label: 'My Profile', href: '/settings/profile', color: '#607D8B' },
  { id: 'help', icon: HelpCircle, label: 'Help', href: '/help', color: '#2196F3' },
  { id: 'settings', icon: Settings, label: 'Settings', href: '/settings', color: '#607D8B' },
];

interface QuickActionsGridProps {
  section: 'quick' | 'stockly' | 'planly' | 'assetly' | 'teamly' | 'settings';
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
            "bg-muted/50 hover:bg-muted",
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
          <span className="text-[11px] font-medium text-center text-muted-foreground leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
