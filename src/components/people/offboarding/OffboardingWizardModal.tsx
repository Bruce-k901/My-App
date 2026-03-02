'use client';

import { useState, useCallback } from 'react';
import { X } from '@/components/ui/icons';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { OffboardingFormData, OffboardingStep } from '@/types/offboarding';
import type { ChecklistCategory } from '@/types/offboarding';
import type { TerminationReason } from '@/types/teamly';
import type { EmployeeProfile } from '@/types/employee';
import { generateDefaultChecklist } from '@/lib/people/offboarding-checklist';
import { ReasonStep } from './steps/ReasonStep';
import { DatesStep } from './steps/DatesStep';
import { ChecklistStep } from './steps/ChecklistStep';
import { FinalPayStep } from './steps/FinalPayStep';
import { ReviewStep } from './steps/ReviewStep';

interface OffboardingWizardModalProps {
  employee: EmployeeProfile;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentUserId: string;
  companyId: string;
  holidayDaysTaken?: number;
  holidayYearStartMonth?: number;
  holidayYearStartDay?: number;
}

const STEPS: { id: OffboardingStep; label: string }[] = [
  { id: 'reason', label: 'Reason' },
  { id: 'dates', label: 'Dates' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'final_pay', label: 'Final Pay' },
  { id: 'confirm', label: 'Confirm' },
];

interface ChecklistItem {
  category: ChecklistCategory;
  title: string;
  description: string | null;
  is_required: boolean;
  is_completed: boolean;
  sort_order: number;
  auto_generated: boolean;
}

export function OffboardingWizardModal({
  employee,
  isOpen,
  onClose,
  onComplete,
  currentUserId,
  companyId,
  holidayDaysTaken = 0,
  holidayYearStartMonth = 1,
  holidayYearStartDay = 1,
}: OffboardingWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<OffboardingFormData>({
    termination_reason: '' as TerminationReason,
    termination_sub_reason: null,
    termination_notes: '',
    termination_date: '',
    last_working_day: '',
    notice_end_date: '',
    pilon_applicable: false,
    eligible_for_rehire: null,
    exit_interview_completed: false,
    schedule_exit_interview: true,
  });

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistGenerated, setChecklistGenerated] = useState(false);

  const handleFormChange = useCallback((updates: Partial<OffboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Generate checklist when entering the checklist step
  const ensureChecklistGenerated = useCallback(() => {
    if (checklistGenerated) return;
    if (!formData.termination_reason) return;

    const templates = generateDefaultChecklist(formData.termination_reason);
    setChecklistItems(
      templates.map((t) => ({
        ...t,
        is_completed: false,
        auto_generated: true,
      })),
    );
    setChecklistGenerated(true);
  }, [checklistGenerated, formData.termination_reason]);

  const handleChecklistToggle = useCallback((index: number) => {
    setChecklistItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, is_completed: !item.is_completed } : item,
      ),
    );
  }, []);

  const handleChecklistAdd = useCallback(
    (item: Omit<ChecklistItem, 'sort_order' | 'auto_generated' | 'is_completed'>) => {
      setChecklistItems((prev) => [
        ...prev,
        {
          ...item,
          is_completed: false,
          sort_order: prev.length,
          auto_generated: false,
        },
      ]);
    },
    [],
  );

  const handleChecklistRemove = useCallback((index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canProceed = (): boolean => {
    switch (STEPS[currentStep].id) {
      case 'reason':
        if (!formData.termination_reason) return false;
        if (formData.termination_reason === 'dismissed' && !formData.termination_sub_reason)
          return false;
        return true;
      case 'dates':
        return !!(formData.termination_date && formData.last_working_day);
      case 'checklist':
      case 'final_pay':
        return true;
      case 'confirm':
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      if (STEPS[nextStep].id === 'checklist') {
        ensureChecklistGenerated();
      }
      setCurrentStep(nextStep);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/people/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          companyId,
          initiatedBy: currentUserId,
          terminationReason: formData.termination_reason,
          terminationSubReason: formData.termination_sub_reason,
          terminationNotes: formData.termination_notes,
          terminationDate: formData.termination_date,
          lastWorkingDay: formData.last_working_day,
          noticeEndDate: formData.notice_end_date,
          pilonApplicable: formData.pilon_applicable,
          eligibleForRehire: formData.eligible_for_rehire,
          scheduleExitInterview: formData.schedule_exit_interview,
          managerId: employee.reports_to || currentUserId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to initiate termination');
      }

      toast.success(`Offboarding process started for ${employee.full_name}`);
      onComplete();
      onClose();
    } catch (err: any) {
      console.error('[OffboardingWizard] Submit error:', err);
      toast.error(err.message || 'Failed to initiate termination');
    } finally {
      setIsSubmitting(false);
    }
  };

  const step = STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Terminate / Offboard Employee</h2>
            <p className="text-sm text-neutral-500">{employee.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => i < currentStep && setCurrentStep(i)}
                  disabled={i > currentStep}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    i === currentStep
                      ? 'bg-teamly-dark/10 dark:bg-teamly/20 dark:text-teamly text-teamly-dark'
                      : i < currentStep
                        ? 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer'
                        : 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < currentStep
                        ? 'bg-teamly-dark dark:bg-teamly text-white'
                        : i === currentStep
                          ? 'bg-teamly-dark/20 dark:bg-teamly/30 dark:text-teamly text-teamly-dark'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {i < currentStep ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-px mx-1 ${
                      i < currentStep ? 'bg-teamly-dark dark:bg-teamly' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {step.id === 'reason' && (
            <ReasonStep formData={formData} onChange={handleFormChange} />
          )}
          {step.id === 'dates' && (
            <DatesStep formData={formData} onChange={handleFormChange} employee={employee} />
          )}
          {step.id === 'checklist' && (
            <ChecklistStep
              items={checklistItems}
              onToggle={handleChecklistToggle}
              onAdd={handleChecklistAdd}
              onRemove={handleChecklistRemove}
            />
          )}
          {step.id === 'final_pay' && (
            <FinalPayStep
              formData={formData}
              employee={employee}
              holidayDaysTaken={holidayDaysTaken}
              holidayYearStartMonth={holidayYearStartMonth}
              holidayYearStartDay={holidayYearStartDay}
            />
          )}
          {step.id === 'confirm' && (
            <ReviewStep
              formData={formData}
              onChange={handleFormChange}
              employee={employee}
              checklistCompletedCount={checklistItems.filter((i) => i.is_completed).length}
              checklistTotalCount={checklistItems.length}
              onConfirm={handleConfirm}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer navigation */}
        {step.id !== 'confirm' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-white/[0.08] shrink-0">
            <button
              onClick={goBack}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-white/[0.12] text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-2 text-sm font-semibold rounded-lg bg-teamly-dark dark:bg-teamly text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
