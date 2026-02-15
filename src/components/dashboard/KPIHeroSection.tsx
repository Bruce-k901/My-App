'use client';

import {
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  ShoppingCart,
  Users,
} from '@/components/ui/icons';
import { motion } from 'framer-motion';
import { useKPIData } from '@/hooks/dashboard/useKPIData';
import { useEnabledModules } from '@/hooks/dashboard';
import { KPICard, KPICardSkeleton } from './KPICard';
import { cn } from '@/lib/utils';

interface KPIHeroSectionProps {
  variant: 'mobile' | 'desktop';
}

export function KPIHeroSection({ variant }: KPIHeroSectionProps) {
  const kpi = useKPIData();
  const { enabledModules } = useEnabledModules();
  const isMobile = variant === 'mobile';

  if (kpi.loading) {
    return (
      <div
        className={cn(
          'flex gap-3 mb-5',
          isMobile ? 'overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4' : ''
        )}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      key: 'tasks',
      label: 'Tasks Completed',
      value: kpi.tasksCompleted.value,
      subtitle: kpi.tasksCompleted.total?.toString(),
      trend: kpi.tasksCompleted.trend,
      sparkline: kpi.tasksCompleted.sparkline,
      status: kpi.tasksCompleted.status,
      color: 'text-teamly',
      accentHex: '#F472B6',
      href: '/dashboard/todays_tasks',
      icon: ClipboardCheck,
      modules: ['checkly'] as string[],
    },
    {
      key: 'compliance',
      label: 'Today\'s Compliance',
      value: `${kpi.complianceScore.value}%`,
      trend: kpi.complianceScore.trend,
      sparkline: kpi.complianceScore.sparkline,
      status: kpi.complianceScore.status,
      color: kpi.complianceScore.status === 'good'
        ? 'text-module-fg'
        : kpi.complianceScore.status === 'warning'
        ? 'text-blue-400'
        : 'text-teamly',
      accentHex: kpi.complianceScore.status === 'good'
        ? '#34D399'
        : kpi.complianceScore.status === 'warning'
        ? '#60A5FA'
        : '#F472B6',
      href: '/dashboard/reports',
      icon: ShieldCheck,
      modules: ['checkly'] as string[],
    },
    {
      key: 'incidents',
      label: 'Open Incidents',
      value: kpi.openIncidents.value,
      trend: kpi.openIncidents.trend,
      sparkline: kpi.openIncidents.sparkline,
      status: kpi.openIncidents.status,
      color: kpi.openIncidents.value > 0 ? 'text-teamly' : 'text-module-fg',
      accentHex: kpi.openIncidents.value > 0 ? '#F472B6' : '#34D399',
      href: '/dashboard/incidents',
      icon: AlertTriangle,
      modules: [] as string[], // always visible
    },
    {
      key: 'orders',
      label: 'Pending Orders',
      value: kpi.pendingOrders.value,
      trend: kpi.pendingOrders.trend,
      sparkline: kpi.pendingOrders.sparkline,
      status: kpi.pendingOrders.status,
      color: 'text-orange-400',
      accentHex: '#FB923C',
      href: '/dashboard/planly/order-book',
      icon: ShoppingCart,
      modules: ['planly'] as string[],
    },
    {
      key: 'staff',
      label: 'Staff On Shift',
      value: kpi.staffOnShift.value,
      sparkline: kpi.staffOnShift.sparkline,
      status: kpi.staffOnShift.status,
      color: 'text-blue-400',
      accentHex: '#60A5FA',
      href: '/dashboard/people/schedule',
      icon: Users,
      modules: ['teamly'] as string[],
    },
  ];

  // Filter by enabled modules (empty modules array = always show)
  const visibleCards = cards.filter(
    (card) => card.modules.length === 0 || card.modules.some((m) => enabledModules.includes(m as any))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex gap-3 mb-5',
        isMobile
          ? 'overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-none'
          : ''
      )}
    >
      {visibleCards.map((card) => (
        <div key={card.key} className={cn(isMobile && 'snap-start flex-shrink-0')}>
          <KPICard
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            trend={card.trend}
            sparklineData={card.sparkline}
            status={card.status}
            color={card.color}
            accentHex={card.accentHex}
            href={card.href}
            icon={card.icon}
          />
        </div>
      ))}
    </motion.div>
  );
}
