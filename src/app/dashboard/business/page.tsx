'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Users,
  ClipboardCheck,
  Package,
  UserCog,
  CheckCircle,
  ChevronRight,
  Loader2,
  Rocket,
  PartyPopper,
  ArrowRight,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type StepStatus = 'not_started' | 'in_progress' | 'complete';

interface SetupStep {
  step: number;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  status: StepStatus;
  detail: string;
}

const stepConfig = [
  {
    step: 1,
    name: 'Company Details',
    description: 'Add your business name, address, and contact information',
    icon: Building2,
    href: '/dashboard/business/details?from=setup',
    color: 'text-teamly',
  },
  {
    step: 2,
    name: 'Add Your Sites',
    description: 'Set up your locations with addresses and operating hours',
    icon: MapPin,
    href: '/dashboard/sites?from=setup',
    color: 'text-emerald-500',
  },
  {
    step: 3,
    name: 'Invite Your Team',
    description: 'Add team members and assign roles so everyone can get started',
    icon: Users,
    href: '/dashboard/users?from=setup',
    color: 'text-blue-500',
  },
  {
    step: 4,
    name: 'Compliance Templates',
    description: 'Import industry checklist templates to hit the ground running',
    icon: ClipboardCheck,
    href: '/dashboard/tasks/compliance?from=setup',
    color: 'text-orange-500',
  },
  {
    step: 5,
    name: 'Stock & Suppliers',
    description: 'Set up storage areas and add your first suppliers',
    icon: Package,
    href: '/dashboard/stockly/storage-areas?from=setup',
    color: 'text-cyan-500',
  },
  {
    step: 6,
    name: 'People & Departments',
    description: 'Configure departments, roles, and shift rules for your team',
    icon: UserCog,
    href: '/dashboard/people/settings/departments?from=setup',
    color: 'text-violet-500',
  },
];

function StepCard({
  step,
  isActive,
  onNavigate,
}: {
  step: SetupStep;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const Icon = step.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all',
        step.status === 'complete'
          ? 'bg-teamly/5 dark:bg-teamly/10 border-teamly/30'
          : isActive
          ? 'bg-theme-surface border-teamly shadow-lg shadow-teamly/10'
          : 'bg-gray-50 dark:bg-white/[0.02] border-theme'
      )}
    >
      {/* Step Number Badge */}
      <div
        className={cn(
          'absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          step.status === 'complete'
            ? 'bg-teamly text-white'
            : isActive
            ? 'bg-teamly text-white'
            : 'bg-gray-200 dark:bg-white/20 text-theme-secondary'
        )}
      >
        {step.status === 'complete' ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          step.step
        )}
      </div>

      <div className="flex items-start justify-between gap-4 ml-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-5 w-5', step.status === 'complete' ? 'text-teamly' : step.color)} />
            <h3 className="font-semibold text-theme-primary">{step.name}</h3>
          </div>
          <p className="text-sm text-theme-secondary mb-2">{step.description}</p>
          <span
            className={cn(
              'text-sm font-medium',
              step.status === 'complete'
                ? 'text-teamly'
                : step.status === 'in_progress'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-theme-tertiary'
            )}
          >
            {step.status === 'complete'
              ? step.detail
              : step.status === 'in_progress'
              ? step.detail
              : 'Not started'}
          </span>
        </div>

        <Button
          variant={isActive ? 'secondary' : 'outline'}
          className="shrink-0"
          onClick={onNavigate}
        >
          {step.status === 'complete' ? 'Edit' : 'Configure'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function CompletionCelebration() {
  return (
    <div className="text-center py-8 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teamly/10 mb-4">
        <PartyPopper className="h-8 w-8 text-teamly" />
      </div>
      <h2 className="text-2xl font-bold text-theme-primary mb-2">
        You're All Set!
      </h2>
      <p className="text-theme-secondary mb-6 max-w-md mx-auto">
        Your business is fully configured. Head to the dashboard to start using Opsly.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="/dashboard/todays_tasks">
            Today's Tasks
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}

async function safeCount(table: string, column: string, value: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(column, value);

    if (error) {
      // 42P01 = table doesn't exist - treat as 0
      if (error.code === '42P01') return 0;
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default function BusinessSetupPage() {
  const router = useRouter();
  const { companyId, company } = useAppContext();
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function checkStatus() {
      setLoading(true);

      // Run all counts in parallel
      const [sitesCount, usersCount, templatesCount, storageCount, deptsCount] = await Promise.all([
        safeCount('sites', 'company_id', companyId!),
        safeCount('profiles', 'company_id', companyId!),
        safeCount('task_templates', 'company_id', companyId!),
        safeCount('storage_areas', 'company_id', companyId!),
        safeCount('departments', 'company_id', companyId!),
      ]);

      const hasCompany = !!(company?.name);

      const results: SetupStep[] = stepConfig.map((cfg) => {
        let status: StepStatus = 'not_started';
        let detail = 'Not started';

        switch (cfg.step) {
          case 1:
            if (hasCompany) {
              status = 'complete';
              detail = company?.name || 'Configured';
            }
            break;
          case 2:
            if (sitesCount > 0) {
              status = 'complete';
              detail = `${sitesCount} site${sitesCount !== 1 ? 's' : ''} added`;
            }
            break;
          case 3:
            if (usersCount > 1) {
              status = 'complete';
              detail = `${usersCount} team members`;
            } else if (usersCount === 1) {
              status = 'in_progress';
              detail = 'Just you so far';
            }
            break;
          case 4:
            if (templatesCount > 0) {
              status = 'complete';
              detail = `${templatesCount} template${templatesCount !== 1 ? 's' : ''} imported`;
            }
            break;
          case 5:
            if (storageCount > 0) {
              status = 'complete';
              detail = `${storageCount} storage area${storageCount !== 1 ? 's' : ''}`;
            }
            break;
          case 6:
            if (deptsCount > 0) {
              status = 'complete';
              detail = `${deptsCount} department${deptsCount !== 1 ? 's' : ''}`;
            }
            break;
        }

        return { ...cfg, status, detail };
      });

      setSteps(results);
      setLoading(false);
    }

    checkStatus();
  }, [companyId, company?.name]);

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-teamly" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <Rocket className="h-12 w-12 mx-auto text-teamly mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Welcome to Opsly</h2>
          <p className="text-theme-secondary mb-6">Let's get your business set up. Start by adding your company details.</p>
          <Button variant="secondary" onClick={() => router.push('/dashboard/business/details')}>
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  const completedSteps = steps.filter((s) => s.status === 'complete').length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const allComplete = completedSteps === totalSteps;

  // Find first incomplete step
  const firstIncompleteStep = steps.find((s) => s.status !== 'complete')?.step ?? -1;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-7 w-7 text-teamly" />
          <h1 className="text-2xl font-bold text-theme-primary">
            Getting Started
          </h1>
        </div>
        <p className="text-theme-secondary">
          Complete these steps to get the most out of Opsly. Each step links to the relevant page where you can configure things at your own pace.
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-theme-secondary">
            Setup Progress
          </span>
          <span className="text-sm font-bold text-teamly">
            {completedSteps} of {totalSteps} complete
          </span>
        </div>
        <div className="h-3 bg-theme-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teamly to-module-fg rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {allComplete && (
          <p className="mt-2 text-sm text-teamly font-medium flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            All steps complete!
          </p>
        )}
      </Card>

      {/* Completion Celebration */}
      {allComplete && (
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-teamly/10 to-module-fg/[0.05]">
            <CompletionCelebration />
          </div>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <StepCard
            key={step.step}
            step={step}
            isActive={firstIncompleteStep === step.step}
            onNavigate={() => handleNavigate(step.href)}
          />
        ))}
      </div>

      {/* Help Section */}
      {!allComplete && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
            Take your time
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            You don't need to complete everything at once. Come back to this page any time from the menu to pick up where you left off.
          </p>
        </div>
      )}
    </div>
  );
}
