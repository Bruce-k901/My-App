"use client";

import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  TrendingUp
} from '@/components/ui/icons';

interface TimeSlot {
  id: string;
  time: string;
  product: string;
  quantity: number;
  percent: number;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  capacity: number;
  unit: string;
  scheduled: number;
  available: number;
  utilizationPercent: number;
  status: 'ok' | 'tight' | 'overloaded';
  overloadAmount?: number;
  schedule?: TimeSlot[];
}

interface CapacityData {
  date: string;
  equipment: Equipment[];
  hasOverload: boolean;
}

interface CapacityStatusProps {
  date: string;
  data?: CapacityData;
  loading?: boolean;
}

export default function CapacityStatus({ date, data, loading }: CapacityStatusProps) {
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'overloaded':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'tight':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-green-400 bg-green-400/10 border-green-400/20';
    }
  }

  function getBarColor(status: string) {
    switch (status) {
      case 'overloaded':
        return 'bg-red-500';
      case 'tight':
        return 'bg-amber-500';
      default:
        return 'bg-green-500';
    }
  }

  function getEquipmentIcon(type: string) {
    switch (type) {
      case 'oven':
        return '🔥';
      case 'fridge':
        return '❄️';
      case 'freezer':
        return '🧊';
      case 'mixer':
        return '🌀';
      case 'proofer':
        return '💨';
      default:
        return '⚙️';
    }
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.equipment.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Capacity Status - {formatDate(date)}
        </h2>
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No equipment configured</p>
          <p className="text-white/40 text-sm mt-2">
            Add equipment in settings to track capacity
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Capacity Status - {formatDate(date)}
        </h2>
        {data.hasOverload && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Equipment Overloaded</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {data.equipment.map((item) => (
          <div
            key={item.id}
            className={`bg-white/[0.03] border rounded-xl p-5 ${
              item.status === 'overloaded'
                ? 'border-red-500/30 bg-red-500/5'
                : item.status === 'tight'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-white/[0.06]'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getEquipmentIcon(item.type)}</span>
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <p className="text-white/40 text-sm capitalize">{item.type}</p>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status === 'overloaded' ? '🚨 Overloaded' :
                 item.status === 'tight' ? '⚠️ Tight' :
                 '✅ OK'}
              </span>
            </div>

            {/* Capacity Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">Utilization</span>
                <span className={`text-sm font-medium ${
                  item.status === 'overloaded' ? 'text-red-400' :
                  item.status === 'tight' ? 'text-amber-400' :
                  'text-green-400'
                }`}>
                  {item.utilizationPercent}%
                </span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getBarColor(item.status)}`}
                  style={{ width: `${Math.min(item.utilizationPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Capacity Details */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-white/60 text-xs mb-1">Capacity</p>
                <p className="text-white font-medium">
                  {item.capacity} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Scheduled</p>
                <p className="text-white font-medium">
                  {item.scheduled} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Available</p>
                <p className={`font-medium ${
                  item.available < (item.capacity * 0.1) ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {item.available} {item.unit}
                </p>
              </div>
            </div>

            {/* Overload Warning */}
            {item.status === 'overloaded' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-medium mb-2">
                      Over capacity by {item.overloadAmount || 0} {item.unit}
                    </p>
                    <div className="space-y-1">
                      <p className="text-red-400/80 text-sm font-medium">Suggested Solutions:</p>
                      <ul className="text-red-400/60 text-sm space-y-1 ml-4 list-disc">
                        <li>Split production into multiple batches</li>
                        <li>Move some items to alternative equipment</li>
                        <li>Start production earlier to spread load</li>
                        <li>Consider using backup equipment if available</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Time Slots */}
            {item.schedule && item.schedule.length > 0 && (
              <div className="pt-4 border-t border-white/[0.06]">
                <p className="text-white/60 text-sm font-medium mb-3">Time Slots:</p>
                <div className="space-y-2">
                  {item.schedule.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-white/40" />
                        <span className="text-white/80 text-sm">{slot.time}</span>
                        <span className="text-white/60 text-sm">{slot.product}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-sm">
                          {slot.quantity} {item.unit}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          slot.percent > 100 ? 'text-red-400 bg-red-400/10' :
                          slot.percent > 80 ? 'text-amber-400 bg-amber-400/10' :
                          'text-green-400 bg-green-400/10'
                        }`}>
                          {slot.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

