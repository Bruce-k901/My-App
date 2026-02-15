"use client";

import dynamic from 'next/dynamic';
import { ComponentType, Suspense } from 'react';

// Loading component for dashboard widgets
const DashboardWidgetSkeleton = () => (
  <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(211, 126, 145,0.05)] animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-5 h-5 bg-white/10 rounded"></div>
      <div className="h-5 bg-white/10 rounded w-32"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-3/4"></div>
      <div className="h-4 bg-white/10 rounded w-1/2"></div>
    </div>
  </div>
);

// Lazy load dashboard components with loading states
export const LazyWelcomeHeader = dynamic(
  () => import('@/components/dashboard/WelcomeHeader'),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="w-full flex justify-center mb-2">
          <div className="h-8 bg-white/10 rounded w-32"></div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="h-8 bg-white/10 rounded w-48 mb-2"></div>
            <div className="h-5 bg-white/10 rounded w-36"></div>
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

export const LazyQuickActions = dynamic(
  () => import('@/components/dashboard/QuickActions'),
  {
    loading: () => <DashboardWidgetSkeleton />,
    ssr: false,
  }
);

export const LazyShiftHandoverNotes = dynamic(
  () => import('@/components/dashboard/ShiftHandoverNotes'),
  {
    loading: () => <DashboardWidgetSkeleton />,
    ssr: false,
  }
);

export const LazyEmergencyBreakdowns = dynamic(
  () => import('@/components/dashboard/EmergencyBreakdowns'),
  {
    loading: () => <DashboardWidgetSkeleton />,
    ssr: false,
  }
);

export const LazyIncidentLog = dynamic(
  () => import('@/components/dashboard/IncidentLog'),
  {
    loading: () => <DashboardWidgetSkeleton />,
    ssr: false,
  }
);

export const LazyMetricsGrid = dynamic(
  () => import('@/components/dashboard/MetricsGrid'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardWidgetSkeleton key={i} />
        ))}
      </div>
    ),
    ssr: false,
  }
);

export const LazyAlertsFeed = dynamic(
  () => import('@/components/dashboard/AlertsFeed'),
  {
    loading: () => <DashboardWidgetSkeleton />,
    ssr: false,
  }
);

// Higher-order component for wrapping lazy components with Suspense
export function withLazySuspense<T extends object>(
  Component: ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: T) {
    return (
      <Suspense fallback={fallback || <DashboardWidgetSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}