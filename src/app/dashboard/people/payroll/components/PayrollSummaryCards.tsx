'use client';

import { Users, Clock, PoundSterling, TrendingUp } from '@/components/ui/icons';

interface Props {
  employees: number;
  hours: number;
  grossPay: number;
  employerCost: number;
}

function formatCurrency(amount: number): string {
  // Explicitly format as GBP with £ symbol
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export default function PayrollSummaryCards({ employees, hours, grossPay, employerCost }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-theme-primary/60">Employees</p>
            <p className="text-2xl font-bold text-theme-primary">{employees}</p>
          </div>
        </div>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-theme-primary/60">Total Hours</p>
            <p className="text-2xl font-bold text-theme-primary">{formatHours(hours)}</p>
          </div>
        </div>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
            <PoundSterling className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-theme-primary/60">Gross Pay</p>
            <p className="text-2xl font-bold text-theme-primary">{formatCurrency(grossPay)}</p>
          </div>
        </div>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-amber-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-theme-primary/60">Total Cost</p>
            <p className="text-2xl font-bold text-theme-primary">{formatCurrency(employerCost)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

