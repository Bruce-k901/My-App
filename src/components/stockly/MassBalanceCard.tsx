// @salsa - SALSA Compliance: Mass balance summary card
'use client';

interface MassBalanceCardProps {
  totalInput: number;
  totalOutput: number;
  variance: number;
  variancePercent: number;
  unit: string;
}

export default function MassBalanceCard({ totalInput, totalOutput, variance, variancePercent, unit }: MassBalanceCardProps) {
  const isAcceptable = Math.abs(variancePercent) <= 5;

  return (
    <div className="bg-theme-bg-secondary rounded-lg p-4 border border-theme-border">
      <h3 className="text-sm font-medium text-theme-tertiary uppercase mb-3">Mass Balance</h3>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-theme-tertiary mb-1">Total Input</p>
          <p className="text-lg font-bold text-theme-primary">
            {totalInput.toFixed(2)} <span className="text-sm font-normal text-theme-tertiary">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-theme-tertiary mb-1">Total Output</p>
          <p className="text-lg font-bold text-theme-primary">
            {totalOutput.toFixed(2)} <span className="text-sm font-normal text-theme-tertiary">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-theme-tertiary mb-1">Variance</p>
          <p className={`text-lg font-bold ${isAcceptable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {variance > 0 ? '+' : ''}{variance.toFixed(2)} <span className="text-sm font-normal">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-theme-tertiary mb-1">Variance %</p>
          <p className={`text-lg font-bold ${isAcceptable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(2)}%
          </p>
          <p className={`text-xs mt-0.5 ${isAcceptable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {isAcceptable ? 'Within tolerance' : 'Outside tolerance'}
          </p>
        </div>
      </div>
    </div>
  );
}
