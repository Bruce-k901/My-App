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
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Employer Costs Summary</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-white/80">Gross Pay:</span>
          <span className="text-white font-medium">{formatCurrency(grossPay)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Employer NI:</span>
          <span className="text-white font-medium">{formatCurrency(employerNi)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Employer Pension:</span>
          <span className="text-white font-medium">{formatCurrency(employerPension)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Holiday Accrual:</span>
          <span className="text-white font-medium">{formatCurrency(holidayAccrual)}</span>
        </div>
        
        <div className="border-t border-white/[0.06] pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Total Employer Cost:</span>
            <span className="text-[#EC4899] font-bold text-lg">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

