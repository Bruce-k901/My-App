"use client";

import { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertTriangle,
  ChefHat,
  Flame,
  Wind,
  Package,
  Truck,
  Loader2
} from '@/components/ui/icons';

interface ProductionTimelineProps {
  date: string;
  schedule?: TimelineStep[];
  loading?: boolean;
  hasConflicts?: boolean;
}

export interface TimelineStep {
  id: string;
  startTime: string;
  endTime: string;
  activity: 'prep' | 'mix' | 'proof' | 'bake' | 'cool' | 'pack' | 'deliver';
  duration: string;
  equipmentId?: string;
  equipmentName?: string;
  capacityPercent?: number;
  capacityStatus?: 'ok' | 'tight' | 'overloaded';
  status: 'pending' | 'in_progress' | 'complete';
  tasks: {
    id: string;
    icon: string;
    description: string;
    ingredients?: {
      id: string;
      name: string;
      quantity: string;
    }[];
  }[];
  notes?: string;
}

export default function ProductionTimeline({ date, schedule = [], loading, hasConflicts = false }: ProductionTimelineProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long' 
    });
  }

  function getActivityIcon(activity: string) {
    switch (activity) {
      case 'prep':
      case 'mix':
        return <ChefHat className="w-5 h-5" />;
      case 'proof':
        return <Wind className="w-5 h-5" />;
      case 'bake':
        return <Flame className="w-5 h-5" />;
      case 'cool':
        return <Wind className="w-5 h-5" />;
      case 'pack':
        return <Package className="w-5 h-5" />;
      case 'deliver':
        return <Truck className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  }

  function getActivityLabel(activity: string): string {
    const labels: Record<string, string> = {
      prep: 'Prep',
      mix: 'Mix',
      proof: 'Proof',
      bake: 'Bake',
      cool: 'Cool',
      pack: 'Pack',
      deliver: 'Deliver'
    };
    return labels[activity] || activity.charAt(0).toUpperCase() + activity.slice(1);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'complete':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'in_progress':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default:
        return 'text-white/40 bg-white/5 border-white/10';
    }
  }

  function getCapacityColor(status?: string) {
    switch (status) {
      case 'overloaded':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'tight':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default:
        return 'text-green-400 bg-green-400/10 border-green-400/20';
    }
  }

  function toggleTaskComplete(taskId: string) {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }

  function toggleStepExpand(stepId: string) {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
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

  if (schedule.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Production Timeline - {formatDate(date)}
        </h2>
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No production schedule available for this date</p>
          <p className="text-white/40 text-sm mt-2">
            Production timeline will appear here once orders are confirmed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">
          Production Timeline - {formatDate(date)}
        </h2>
        {hasConflicts ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Capacity Conflicts Detected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Schedule Optimized</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {schedule.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const isLast = index === mockSchedule.length - 1;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step.status === 'complete' 
                    ? 'bg-green-400/20 border-green-400 text-green-400'
                    : step.status === 'in_progress'
                    ? 'bg-blue-400/20 border-blue-400 text-blue-400'
                    : 'bg-white/5 border-white/20 text-white/40'
                }`}>
                  {step.status === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    getActivityIcon(step.activity)
                  )}
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-white/10 mt-2" style={{ minHeight: '80px' }} />
                )}
              </div>

              {/* Step Card */}
              <div className="flex-1 pb-6">
                <div className={`bg-white/[0.03] border rounded-xl p-4 ${
                  step.capacityStatus === 'overloaded' 
                    ? 'border-red-500/30 bg-red-500/5'
                    : step.capacityStatus === 'tight'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-white/[0.06]'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white/60 text-sm font-medium">
                          {formatTime(step.startTime)}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                          {getActivityLabel(step.activity)}
                        </span>
                        <span className="text-white/40 text-xs">
                          {step.duration}
                        </span>
                      </div>
                      
                      {step.equipmentName && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-white/60 text-sm">Equipment:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getCapacityColor(step.capacityStatus)}`}>
                            {step.equipmentName} {step.capacityPercent !== undefined && `${step.capacityPercent}%`}
                          </span>
                        </div>
                      )}
                    </div>

                    {step.tasks.length > 0 && (
                      <button
                        onClick={() => toggleStepExpand(step.id)}
                        className="text-[#D37E91] text-sm hover:text-[#D37E91]/80 transition-colors"
                      >
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </button>
                    )}
                  </div>

                  {step.notes && (
                    <p className="text-white/60 text-sm mb-3">{step.notes}</p>
                  )}

                  {isExpanded && step.tasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                      {step.tasks.map((task) => {
                        const isCompleted = completedTasks.has(task.id);
                        
                        return (
                          <div key={task.id} className="flex items-start gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => toggleTaskComplete(task.id)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isCompleted
                                    ? 'bg-green-400/20 border-green-400'
                                    : 'bg-white/5 border-white/20 hover:border-[#D37E91]'
                                }`}
                              >
                                {isCompleted && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                              </button>
                              <span className="text-lg">{task.icon}</span>
                              <span className={`text-sm ${isCompleted ? 'text-white/40 line-through' : 'text-white'}`}>
                                {task.description}
                              </span>
                            </div>
                            
                            {task.ingredients && task.ingredients.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {task.ingredients.map((ing) => (
                                  <span
                                    key={ing.id}
                                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/60"
                                  >
                                    {ing.quantity} {ing.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

