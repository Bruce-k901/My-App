'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ArrowRight,
  Loader2,
  Flame,
  Truck,
  Grid3X3,
  Layers,
  Package,
  Users,
  PartyPopper,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppContext } from '@/context/AppContext';
import type { SetupWizardStatus, SetupWizardStep } from '@/types/planly';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Step configuration with icons and descriptions
// Reordered to match production plan flow: Packing → Dough → Oven → Timeline → Products → Customers
const stepConfig: Record<number, {
  icon: React.ElementType;
  description: string;
  href: string;
  color: string;
}> = {
  1: {
    icon: Truck,
    description: 'Set up your delivery routes and dispatch times',
    href: '/dashboard/planly/settings/destination-groups',
    color: 'text-green-500',
  },
  2: {
    icon: Layers,
    description: 'Set up your base doughs and lamination styles',
    href: '/dashboard/planly/settings/production',
    color: 'text-cyan-500',
  },
  3: {
    icon: Flame,
    description: 'Set up tray sizes and baking groups for the tray plan',
    href: '/dashboard/planly/settings/oven-trays',
    color: 'text-orange-500',
  },
  4: {
    icon: Grid3X3,
    description: 'Define your multi-day production process',
    href: '/dashboard/planly/settings/process-templates',
    color: 'text-purple-500',
  },
  5: {
    icon: Package,
    description: 'Link Stockly ingredients as saleable Planly products',
    href: '/dashboard/planly/products',
    color: 'text-amber-500',
  },
  6: {
    icon: Users,
    description: 'Add wholesale customers who will place orders',
    href: '/dashboard/planly/customers',
    color: 'text-rose-500',
  },
};

function StepCard({
  step,
  isActive,
  onNavigate,
}: {
  step: SetupWizardStep;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const config = stepConfig[step.step];
  const Icon = config?.icon || Circle;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all',
        step.complete
          ? 'bg-[#14B8A6]/5 border-[#14B8A6]/30 dark:bg-[#14B8A6]/10'
          : isActive
          ? 'bg-white dark:bg-white/5 border-[#14B8A6] shadow-lg'
          : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/10'
      )}
    >
      {/* Step Number Badge */}
      <div
        className={cn(
          'absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          step.complete
            ? 'bg-[#14B8A6] text-white'
            : isActive
            ? 'bg-[#14B8A6] text-white'
            : 'bg-gray-200 dark:bg-white/20 text-gray-600 dark:text-white/60'
        )}
      >
        {step.complete ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          step.step
        )}
      </div>

      <div className="flex items-start justify-between gap-4 ml-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-5 w-5', step.complete ? 'text-[#14B8A6]' : config?.color)} />
            <h3 className="font-semibold text-gray-900 dark:text-white">{step.name}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-white/60 mb-2">{config?.description}</p>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-sm font-medium',
                step.complete
                  ? 'text-[#14B8A6]'
                  : step.count > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 dark:text-white/50'
              )}
            >
              {step.complete
                ? `${step.count} configured`
                : step.count > 0
                ? `${step.count} so far`
                : 'Not started'}
            </span>
          </div>
          {/* Show issues if any */}
          {step.issues && step.issues.length > 0 && (
            <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              {step.issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          variant={isActive ? 'default' : 'outline'}
          size="sm"
          onClick={onNavigate}
          className={cn(
            'shrink-0',
            isActive && 'bg-[#14B8A6] hover:bg-[#14B8A6]/90'
          )}
        >
          {step.complete ? 'Edit' : 'Configure'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function CompletionCelebration() {
  return (
    <div className="text-center py-8 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#14B8A6]/10 mb-4">
        <PartyPopper className="h-8 w-8 text-[#14B8A6]" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Setup Complete!
      </h2>
      <p className="text-gray-600 dark:text-white/60 mb-6 max-w-md mx-auto">
        Your Planly module is fully configured. You can now start taking orders and generating production plans.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" asChild>
          <a href="/dashboard/planly/order-book">View Order Book</a>
        </Button>
        <Button className="bg-[#14B8A6] hover:bg-[#14B8A6]/90" asChild>
          <a href="/dashboard/planly/production-plan">
            Production Plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  const router = useRouter();
  const { siteId } = useAppContext();

  const { data: status, error, isLoading, mutate } = useSWR<SetupWizardStatus>(
    siteId ? `/api/planly/setup-status?siteId=${siteId}` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const handleNavigate = (stepNumber: number) => {
    const config = stepConfig[stepNumber];
    if (config?.href) {
      router.push(config.href);
    }
  };

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <p className="text-gray-600 dark:text-white/60">Please select a site to continue</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-500">Error loading setup status</p>
        </div>
      </div>
    );
  }

  const completedSteps = status?.steps.filter(s => s.complete).length || 0;
  const totalSteps = status?.steps.length || 7;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Planly Setup Wizard
        </h1>
        <p className="text-gray-600 dark:text-white/60">
          Complete these steps to get your wholesale ordering system ready.
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-white/80">
            Setup Progress
          </span>
          <span className="text-sm font-bold text-[#14B8A6]">
            {completedSteps} of {totalSteps} complete
          </span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#14B8A6] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {status?.overall_complete && (
          <p className="mt-2 text-sm text-[#14B8A6] font-medium flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            All steps complete!
          </p>
        )}
      </Card>

      {/* Completion Celebration */}
      {status?.overall_complete && (
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-[#14B8A6]/10 to-[#14B8A6]/5">
            <CompletionCelebration />
          </div>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {status?.steps.map((step) => (
          <StepCard
            key={step.step}
            step={step}
            isActive={status.next_incomplete_step === step.step}
            onNavigate={() => handleNavigate(step.step)}
          />
        ))}
      </div>

      {/* Quick Links */}
      {!status?.overall_complete && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Check out our documentation for detailed guidance on configuring each section.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
            asChild
          >
            <a href="/docs/planly" target="_blank">
              View Documentation
              <ArrowRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
