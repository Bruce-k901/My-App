'use client';

interface Props {
  grossPay: number;
  employerNi: number;
  employerPension: number;
  holidayAccrual: number;
  totalCost: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export default function EmployerCostsSummary({
  grossPay,
  employerNi,
  employerPension,
  holidayAccrual,
  totalCost,
}: Props) {
  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-theme-primary mb-4">Employer Costs Summary</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-theme-secondary">Gross Pay:</span>
          <span className="text-theme-primary font-medium">{formatCurrency(grossPay)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-theme-secondary">Employer NI:</span>
          <span className="text-theme-primary font-medium">{formatCurrency(employerNi)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-theme-secondary">Employer Pension:</span>
          <span className="text-theme-primary font-medium">{formatCurrency(employerPension)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-theme-secondary">Holiday Accrual:</span>
          <span className="text-theme-primary font-medium">{formatCurrency(holidayAccrual)}</span>
        </div>
        
        <div className="border-t border-theme pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-theme-primary font-semibold">Total Employer Cost:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

