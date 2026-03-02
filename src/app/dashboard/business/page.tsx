'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Users,
  UserCog,
  ClipboardCheck,
  FileText,
  Thermometer,
  ShieldAlert,
  Package,
  Truck,
  Barcode,
  CookingPot,
  IdCard,
  Notebook,
  GraduationCap,
  Wrench,
  Construction,
  CalendarCheck,
  Map,
  Factory,
  ShoppingCart,
  Store,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Loader2,
  Rocket,
  PartyPopper,
  ArrowRight,
  SkipForward,
  FileEdit,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppContext } from '@/context/AppContext';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useSetupNav } from '@/hooks/useSetupNav';
import { ONBOARDING_SECTIONS, SECTION_ORDER, type OnboardingSection, type OnboardingStepWithStatus, type StepStatus } from '@/types/onboarding';
import { cn } from '@/lib/utils';

// ─── Icon map ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, MapPin, Users, UserCog,
  ClipboardCheck, FileText, Thermometer, ShieldAlert,
  Package, Truck, Barcode, CookingPot,
  IdCard, Notebook, GraduationCap,
  Wrench, Construction, CalendarCheck,
  Map, Factory, ShoppingCart, Store,
  // Aliases for step registry icon names
  ShieldWarning: ShieldAlert,
  IdentificationCard: IdCard,
  HardHat: Construction,
  MapTrifold: Map,
  Bread: Factory,
  Oven: Thermometer,
  Storefront: Store,
};

// ─── Module colour classes ─────────────────────────────────────────────────

const MODULE_COLOURS: Record<string, { text: string; bg: string; border: string; progressBg: string }> = {
  core: {
    text: 'text-teamly-dark dark:text-teamly',
    bg: 'bg-teamly-dark/[0.06] dark:bg-teamly/[0.12]',
    border: 'border-teamly-dark/30 dark:border-teamly/30',
    progressBg: 'bg-teamly-dark dark:bg-teamly',
  },
  checkly: {
    text: 'text-checkly-dark dark:text-checkly',
    bg: 'bg-checkly-dark/[0.06] dark:bg-checkly/[0.12]',
    border: 'border-checkly-dark/30 dark:border-checkly/30',
    progressBg: 'bg-checkly-dark dark:bg-checkly',
  },
  stockly: {
    text: 'text-stockly-dark dark:text-stockly',
    bg: 'bg-stockly-dark/[0.06] dark:bg-stockly/[0.12]',
    border: 'border-stockly-dark/30 dark:border-stockly/30',
    progressBg: 'bg-stockly-dark dark:bg-stockly',
  },
  teamly: {
    text: 'text-teamly-dark dark:text-teamly',
    bg: 'bg-teamly-dark/[0.06] dark:bg-teamly/[0.12]',
    border: 'border-teamly-dark/30 dark:border-teamly/30',
    progressBg: 'bg-teamly-dark dark:bg-teamly',
  },
  assetly: {
    text: 'text-assetly-dark dark:text-assetly',
    bg: 'bg-assetly-dark/[0.06] dark:bg-assetly/[0.12]',
    border: 'border-assetly-dark/30 dark:border-assetly/30',
    progressBg: 'bg-assetly-dark dark:bg-assetly',
  },
  planly: {
    text: 'text-planly-dark dark:text-planly',
    bg: 'bg-planly-dark/[0.06] dark:bg-planly/[0.12]',
    border: 'border-planly-dark/30 dark:border-planly/30',
    progressBg: 'bg-planly-dark dark:bg-planly',
  },
};

// ─── Components ────────────────────────────────────────────────────────────

function StepRow({
  step,
  colours,
  isAdmin,
  onNavigate,
  onMarkComplete,
  onSkip,
}: {
  step: OnboardingStepWithStatus;
  colours: typeof MODULE_COLOURS.core;
  isAdmin: boolean;
  onNavigate: () => void;
  onMarkComplete: () => void;
  onSkip: () => void;
}) {
  const Icon = ICON_MAP[step.icon] || Package;
  const isDone = step.status === 'complete' || step.status === 'skipped';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        isDone ? 'opacity-70' : 'hover:bg-theme-hover'
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
          isDone
            ? `${colours.bg} ${colours.text}`
            : 'bg-theme-muted text-theme-tertiary'
        )}
      >
        {isDone ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Step info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', isDone ? 'text-theme-secondary line-through' : 'text-theme-primary')}>
            {step.name}
          </span>
          {step.status === 'skipped' && (
            <span className="text-xs text-theme-tertiary bg-theme-muted px-1.5 py-0.5 rounded">Skipped</span>
          )}
        </div>
        <p className="text-xs text-theme-tertiary truncate">{step.description}</p>
        {step.detail && step.detail !== 'Not started' && step.status === 'complete' && (
          <p className={cn('text-xs font-medium mt-0.5', colours.text)}>{step.detail}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isAdmin && !isDone && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              className="p-1 text-theme-tertiary hover:text-theme-secondary rounded"
              title="Skip this step"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onMarkComplete(); }}
              className={cn('p-1 rounded hover:opacity-80', colours.text)}
              title="Mark complete"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <Button
          variant={isDone ? 'ghost' : 'outline'}
          className="h-7 px-2.5 text-xs"
          onClick={onNavigate}
        >
          {isDone ? 'Edit' : 'Configure'}
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  label,
  steps,
  completedCount,
  totalCount,
  isAdmin,
  defaultOpen,
  onNavigate,
  onUpdateStep,
}: {
  section: OnboardingSection;
  label: string;
  steps: OnboardingStepWithStatus[];
  completedCount: number;
  totalCount: number;
  isAdmin: boolean;
  defaultOpen: boolean;
  onNavigate: (href: string) => void;
  onUpdateStep: (stepId: string, status: StepStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colours = MODULE_COLOURS[section];
  const meta = ONBOARDING_SECTIONS[section];
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allSectionDone = completedCount === totalCount;

  return (
    <Card className={cn('!p-0 overflow-hidden', allSectionDone && `border-2 ${colours.border}`)}>
      {/* Section header — clickable to expand/collapse */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-theme-hover transition-colors"
      >
        <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', colours.bg)}>
          {allSectionDone ? (
            <CheckCircle className={cn('h-5 w-5', colours.text)} />
          ) : (
            <span className={cn('text-sm font-bold', colours.text)}>
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-theme-primary">{label}</h3>
            {allSectionDone && (
              <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', colours.bg, colours.text)}>
                Complete
              </span>
            )}
          </div>
          <p className="text-xs text-theme-tertiary">{meta.description}</p>
          {/* Mini progress bar */}
          <div className="mt-1.5 h-1 bg-theme-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', colours.progressBg)}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <ChevronDown
          className={cn(
            'h-4 w-4 text-theme-tertiary transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded step list */}
      {isOpen && (
        <div className="border-t border-theme px-2 pb-2">
          {steps.map((step) => (
            <StepRow
              key={step.stepId}
              step={step}
              colours={colours}
              isAdmin={isAdmin}
              onNavigate={() => onNavigate(step.href)}
              onMarkComplete={() => onUpdateStep(step.stepId, 'complete')}
              onSkip={() => onUpdateStep(step.stepId, 'skipped')}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function CompletionCelebration({ isPartial }: { isPartial: boolean }) {
  return (
    <div className="text-center py-6 px-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teamly/10 mb-3">
        <PartyPopper className="h-7 w-7 text-teamly" />
      </div>
      <h2 className="text-xl font-bold text-theme-primary mb-1.5">
        {isPartial ? 'Core Setup Complete!' : "You're All Set!"}
      </h2>
      <p className="text-theme-secondary text-sm mb-4 max-w-md mx-auto">
        {isPartial
          ? 'Great work! Your core setup is done. Continue configuring modules below, or head to the dashboard.'
          : 'Your business is fully configured. Head to the dashboard to start using Opsly.'}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
        <Button variant="secondary" asChild>
          <a href="/dashboard/todays_tasks">
            Today&apos;s Tasks
            <ArrowRight className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function BusinessSetupPage() {
  const router = useRouter();
  const { companyId, role } = useAppContext();
  const { sections, loading, totalCompleted, totalSteps, allComplete, updateStep } = useOnboardingProgress();
  const { setupHref } = useSetupNav();

  const isAdmin = ['Admin', 'Owner', 'General Manager', 'Manager'].includes(role || '');
  const progressPercent = totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;

  // Check if core section is complete
  const coreSection = sections.find((s) => s.section === 'core');
  const coreComplete = coreSection ? coreSection.completedCount === coreSection.totalCount : false;

  const handleNavigate = (href: string) => {
    router.push(setupHref(href));
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
          <p className="text-theme-secondary mb-6">Let&apos;s get your business set up. Start by adding your company details.</p>
          <Button variant="secondary" onClick={() => router.push('/dashboard/business/details')}>
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-7 w-7 text-teamly" />
          <h1 className="text-2xl font-bold text-theme-primary">Getting Started</h1>
        </div>
        <p className="text-theme-secondary text-sm">
          Complete these steps to get the most out of Opsly. Work through each section at your own pace.
        </p>
      </div>

      {/* Overall progress bar */}
      <Card className="!p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-theme-secondary">Setup Progress</span>
          <span className="text-sm font-bold text-teamly-dark dark:text-teamly">
            {totalCompleted} of {totalSteps} complete
          </span>
        </div>
        <div className="h-3 bg-theme-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teamly-dark to-teamly dark:from-teamly dark:to-teamly/70 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {allComplete && (
          <p className="mt-2 text-sm text-teamly-dark dark:text-teamly font-medium flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            All steps complete!
          </p>
        )}
      </Card>

      {/* All-complete celebration */}
      {allComplete && (
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-teamly/10 to-teamly/[0.02]">
            <CompletionCelebration isPartial={false} />
          </div>
        </Card>
      )}

      {/* Core-complete celebration (only if core is done but not all) */}
      {coreComplete && !allComplete && (
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-teamly/10 to-teamly/[0.02]">
            <CompletionCelebration isPartial={true} />
          </div>
        </Card>
      )}

      {/* Section cards */}
      <div className="space-y-3">
        {sections.map((sectionData) => {
          // Core always starts expanded; others auto-expand if they have incomplete steps
          const hasIncomplete = sectionData.completedCount < sectionData.totalCount;
          const defaultOpen =
            sectionData.section === 'core' ||
            (hasIncomplete && sectionData.completedCount > 0);

          return (
            <SectionCard
              key={sectionData.section}
              section={sectionData.section}
              label={sectionData.label}
              steps={sectionData.steps}
              completedCount={sectionData.completedCount}
              totalCount={sectionData.totalCount}
              isAdmin={isAdmin}
              defaultOpen={defaultOpen}
              onNavigate={handleNavigate}
              onUpdateStep={updateStep}
            />
          );
        })}
      </div>

      {/* Help section */}
      {!allComplete && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">Take your time</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            You don&apos;t need to complete everything at once. Come back to this page any time from the menu to pick up where you left off.
          </p>
        </div>
      )}
    </div>
  );
}
