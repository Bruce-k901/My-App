'use client';

import { Rota, StaffHours, DayForecast } from './types';
import { 
  TrendingUp, 
  DollarSign,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Info
} from '@/components/ui/icons';

interface CostPanelProps {
  rota: Rota;
  staffHours: StaffHours[];
  forecasts: DayForecast[];
  onSetTarget: () => void;
}

export function CostPanel({ rota, staffHours, forecasts, onSetTarget }: CostPanelProps) {
  // Calculate predicted revenue from forecasts
  const predictedRevenue = forecasts.reduce(
    (sum, f) => sum + (f.forecast?.predicted_revenue || 0), 
    0
  );
  
  const recommendedHours = forecasts.reduce(
    (sum, f) => sum + (f.forecast?.recommended_hours || 0),
    0
  );

  const targetLabourPct = rota.target_labour_percentage || 28;
  const actualLabourPct = predictedRevenue > 0 
    ? (rota.total_cost / predictedRevenue) * 100 
    : 0;

  const labourStatus = actualLabourPct <= targetLabourPct ? 'good' : 
    actualLabourPct <= targetLabourPct + 3 ? 'warning' : 'over';

  // Hours analysis
  const overtimeHours = staffHours.reduce(
    (sum, s) => sum + Math.max(0, s.hours_difference), 
    0
  );

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Main Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
          {/* Total Labour Cost */}
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Labour Cost
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(rota.total_cost)}
            </p>
            {rota.target_labour_cost && (
              <p className="text-xs text-neutral-500">
                Target: {formatCurrency(rota.target_labour_cost)}
              </p>
            )}
          </div>

          {/* Labour Percentage */}
          <div className={`rounded-lg p-3 ${
            labourStatus === 'good' ? 'bg-green-500/10 border border-green-500/30' :
            labourStatus === 'warning' ? 'bg-amber-500/10 border border-amber-500/30' :
            'bg-red-500/10 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <Target className="w-3.5 h-3.5" />
              Labour %
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${
                labourStatus === 'good' ? 'text-green-400' :
                labourStatus === 'warning' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {actualLabourPct.toFixed(1)}%
              </p>
              {labourStatus === 'good' ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className={`w-5 h-5 ${
                  labourStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
                }`} />
              )}
            </div>
            <p className="text-xs text-neutral-500">Target: {targetLabourPct}%</p>
          </div>

          {/* Total Hours */}
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              Scheduled Hours
            </div>
            <p className="text-xl font-bold text-white">{rota.total_hours}h</p>
            <p className="text-xs text-neutral-500">
              Recommended: {recommendedHours.toFixed(0)}h
            </p>
          </div>

          {/* Predicted Revenue */}
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Predicted Revenue
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(predictedRevenue)}
            </p>
            <p className="text-xs text-neutral-500">Based on history</p>
          </div>

          {/* Staff Scheduled */}
          <div className="bg-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              Staff Rostered
            </div>
            <p className="text-xl font-bold text-white">
              {staffHours.filter(s => s.scheduled_hours > 0).length}
            </p>
            <p className="text-xs text-neutral-500">
              Total pool: {staffHours.length}
            </p>
          </div>

          {/* Overtime */}
          <div className={`rounded-lg p-3 ${
            overtimeHours > 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-neutral-800'
          }`}>
            <div className="flex items-center gap-2 text-gray-500 dark:text-white/60 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Overtime
            </div>
            <p className={`text-xl font-bold ${
              overtimeHours > 0 ? 'text-amber-400' : 'text-gray-500 dark:text-white/60'
            }`}>
              {overtimeHours.toFixed(1)}h
            </p>
            <p className="text-xs text-neutral-500">Above contracted</p>
          </div>
        </div>

        {/* Staff Hours Summary */}
        {staffHours.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-3">
            <h4 className="text-sm font-medium text-white mb-3">Staff Hours Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {staffHours
                .filter(s => s.scheduled_hours > 0)
                .sort((a, b) => b.scheduled_hours - a.scheduled_hours)
                .slice(0, 6)
                .map((staff) => (
                  <div key={staff.profile_id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{staff.full_name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 dark:text-white/60">
                          {staff.scheduled_hours}h
                        </span>
                        {staff.contracted_hours && (
                          <span className={`${
                            staff.hours_difference > 0 ? 'text-amber-400' :
                            staff.hours_difference < 0 ? 'text-blue-400' :
                            'text-green-400'
                          }`}>
                            ({staff.hours_difference > 0 ? '+' : ''}{staff.hours_difference}h)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {staffHours.filter(s => s.scheduled_hours > 0).length > 6 && (
              <p className="text-xs text-neutral-500 mt-2">
                + {staffHours.filter(s => s.scheduled_hours > 0).length - 6} more staff scheduled
              </p>
            )}
          </div>
        )}

        {/* Efficiency Tips */}
        <div className="mt-4 flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Scheduling Tips</p>
            <p className="text-xs text-blue-300/70 mt-1">
              {labourStatus === 'over' 
                ? `Labour is ${(actualLabourPct - targetLabourPct).toFixed(1)}% over target. Consider reducing hours on slower days or using lower-cost staff.`
                : rota.total_hours < recommendedHours * 0.9
                  ? `You're ${(recommendedHours - rota.total_hours).toFixed(0)}h under the recommended staffing. Check peak hours are covered.`
                  : overtimeHours > 10
                    ? `${overtimeHours.toFixed(0)}h of overtime scheduled. Consider spreading hours more evenly.`
                    : 'Looking good! Labour costs are within target and hours are well distributed.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

