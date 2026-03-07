'use client';

import React, { Suspense } from 'react';
import type { EmployeeProfile } from '@/types/employee';

const OffboardingWizardModal = React.lazy(() =>
  import('./OffboardingWizardModal').then((mod) => ({ default: mod.OffboardingWizardModal })),
);

interface LazyOffboardingWizardProps {
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

export function LazyOffboardingWizard(props: LazyOffboardingWizardProps) {
  if (!props.isOpen) return null;

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-teamly border-t-transparent rounded-full" />
        </div>
      }
    >
      <OffboardingWizardModal {...props} />
    </Suspense>
  );
}
