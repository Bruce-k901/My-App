'use client';

import React, { ErrorInfo, Component, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { WidgetConfig, MODULE_COLORS, WidgetProps } from '@/types/dashboard';
import { WidgetSkeleton } from './WidgetSkeleton';
import { ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface WidgetWrapperProps {
  config: WidgetConfig;
  companyId: string;
  siteId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for individual widgets
 */
class WidgetErrorBoundary extends Component<
  { children: ReactNode; widgetName: string; onRetry: () => void },
  WidgetErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget error in ${this.props.widgetName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-2">
            Failed to load {this.props.widgetName}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry();
            }}
            className="flex items-center gap-1 text-xs text-pink-500 hover:text-pink-400"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for dashboard widgets
 * Provides: error boundary, loading state, module color border, collapsible header
 */
export function WidgetWrapper({
  config,
  companyId,
  siteId,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
}: WidgetWrapperProps) {
  const [retryKey, setRetryKey] = React.useState(0);
  const moduleColors = MODULE_COLORS[config.module];

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  const WidgetComponent = config.component;

  // Mobile collapsible card
  if (isMobile && onToggleCollapse) {
    return (
      <div
        className={cn(
          'bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl overflow-hidden',
          'border-l-4',
          moduleColors.border
        )}
      >
        {/* Collapsible Header */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-medium text-[rgb(var(--text-primary))] dark:text-white">
            {config.name}
          </span>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
          ) : (
            <ChevronUp className="w-5 h-5 text-[rgb(var(--text-tertiary))] dark:text-white/40" />
          )}
        </button>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            <WidgetErrorBoundary widgetName={config.name} onRetry={handleRetry}>
              <React.Suspense fallback={<WidgetSkeleton size={config.defaultSize} />}>
                <WidgetComponent
                  key={retryKey}
                  companyId={companyId}
                  siteId={siteId}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={onToggleCollapse}
                />
              </React.Suspense>
            </WidgetErrorBoundary>
          </div>
        )}
      </div>
    );
  }

  // Desktop standard card
  return (
    <div
      className={cn(
        'bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl',
        'border-l-4',
        moduleColors.border,
        'h-full'
      )}
    >
      <WidgetErrorBoundary widgetName={config.name} onRetry={handleRetry}>
        <React.Suspense fallback={<WidgetSkeleton size={config.defaultSize} />}>
          <WidgetComponent
            key={retryKey}
            companyId={companyId}
            siteId={siteId}
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </React.Suspense>
      </WidgetErrorBoundary>
    </div>
  );
}

/**
 * Base card component for widget content
 * Use this inside widget components for consistent styling
 */
export function WidgetCard({
  title,
  icon,
  badge,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-4 h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="font-semibold text-[rgb(var(--text-primary))] dark:text-white text-sm">
            {title}
          </h3>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">{children}</div>

      {/* Footer with View All link */}
      {viewAllHref && (
        <div className="mt-3 pt-3 border-t border-theme dark:border-white/[0.06]">
          <Link
            href={viewAllHref}
            className="text-xs text-pink-500 hover:text-pink-400 font-medium"
          >
            {viewAllLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Empty state for widgets with no data
 */
export function WidgetEmptyState({
  icon,
  message,
  actionLabel,
  actionHref,
}: {
  icon?: ReactNode;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center h-full min-h-[80px]">
      {icon && <div className="text-[rgb(var(--text-tertiary))] dark:text-white/30 mb-2">{icon}</div>}
      <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-2">{message}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="text-xs text-pink-500 hover:text-pink-400 font-medium">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/**
 * Loading state for widget content
 */
export function WidgetLoading() {
  return (
    <div className="flex items-center justify-center p-4 h-full min-h-[80px]">
      <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
