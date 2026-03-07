'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Building2, Package, MapPin, User, Wrench, Calendar, Clock, DollarSign } from '@/components/ui/icons';
import { PRIORITY_CONFIG, WO_STATUS_CONFIG, WO_TYPE_CONFIG } from '@/types/rm';
import type { WorkOrder, WOStatus, WorkOrderComment } from '@/types/rm';
import SLAIndicator from './SLAIndicator';
import WorkOrderTimeline from './WorkOrderTimeline';
import WorkOrderComments from './WorkOrderComments';

interface Props {
  workOrder: WorkOrder;
  onStatusChange: (woId: string, newStatus: WOStatus) => Promise<void>;
  onAddComment: (woId: string, content: string) => Promise<void>;
  fetchComments: (woId: string) => Promise<WorkOrderComment[]>;
}

export default function WorkOrderCard({ workOrder, onStatusChange, onAddComment, fetchComments }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<WorkOrderComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[workOrder.priority];
  const statusConfig = WO_STATUS_CONFIG[workOrder.status];
  const typeConfig = WO_TYPE_CONFIG[workOrder.wo_type];
  const targetName = workOrder.target_type === 'equipment' ? workOrder.asset_name : workOrder.building_asset_name;

  useEffect(() => {
    if (isExpanded && comments.length === 0) {
      setLoadingComments(true);
      fetchComments(workOrder.id)
        .then(setComments)
        .catch(console.error)
        .finally(() => setLoadingComments(false));
    }
  }, [isExpanded]);

  const handleStatusChange = async (newStatus: WOStatus) => {
    setChangingStatus(true);
    try {
      await onStatusChange(workOrder.id, newStatus);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddComment = async (content: string) => {
    await onAddComment(workOrder.id, content);
    const updated = await fetchComments(workOrder.id);
    setComments(updated);
  };

  return (
    <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden transition-all">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-theme-hover/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Priority indicator */}
          <span
            className="w-1.5 h-10 rounded-full flex-shrink-0"
            style={{
              backgroundColor: workOrder.priority === 'P1' ? '#EF4444' : workOrder.priority === 'P2' ? '#F59E0B' : workOrder.priority === 'P3' ? '#3B82F6' : '#9CA3AF',
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-theme-tertiary">{workOrder.wo_number}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityConfig.bgColour} ${priorityConfig.colour}`}>
                {workOrder.priority}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.bgColour} ${statusConfig.colour}`}>
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-sm font-medium text-theme-primary truncate mt-0.5">{workOrder.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {workOrder.target_type === 'building_fabric' ? (
                <Building2 className="w-3 h-3 text-theme-tertiary" />
              ) : (
                <Package className="w-3 h-3 text-theme-tertiary" />
              )}
              <span className="text-xs text-theme-tertiary truncate">{targetName || 'Unknown asset'}</span>
              {workOrder.site_name && (
                <>
                  <span className="text-xs text-theme-tertiary">·</span>
                  <span className="text-xs text-theme-tertiary">{workOrder.site_name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <SLAIndicator workOrder={workOrder} />
          {isExpanded ? <ChevronUp className="w-4 h-4 text-theme-tertiary" /> : <ChevronDown className="w-4 h-4 text-theme-tertiary" />}
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-theme space-y-4">
          {/* Description */}
          {workOrder.description && (
            <p className="text-sm text-theme-secondary">{workOrder.description}</p>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-theme-tertiary">
              <span className="font-medium text-theme-secondary">Type:</span> {typeConfig.label}
            </div>
            <div className="text-theme-tertiary">
              <span className="font-medium text-theme-secondary">Priority:</span> {priorityConfig.label} ({priorityConfig.description})
            </div>
            {workOrder.contractor_name && (
              <div className="flex items-center gap-1.5 text-theme-tertiary">
                <Wrench className="w-3.5 h-3.5" />
                <span className="font-medium text-theme-secondary">Contractor:</span> {workOrder.contractor_name}
              </div>
            )}
            {workOrder.assigned_user_name && (
              <div className="flex items-center gap-1.5 text-theme-tertiary">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium text-theme-secondary">Assigned:</span> {workOrder.assigned_user_name}
              </div>
            )}
            {workOrder.reported_by_name && (
              <div className="text-theme-tertiary">
                <span className="font-medium text-theme-secondary">Reported by:</span> {workOrder.reported_by_name}
              </div>
            )}
            {workOrder.scheduled_date && (
              <div className="flex items-center gap-1.5 text-theme-tertiary">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium text-theme-secondary">Scheduled:</span> {new Date(workOrder.scheduled_date).toLocaleDateString('en-GB')}
              </div>
            )}
            {workOrder.due_date && (
              <div className="flex items-center gap-1.5 text-theme-tertiary">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium text-theme-secondary">Due:</span> {new Date(workOrder.due_date).toLocaleDateString('en-GB')}
              </div>
            )}
            {(workOrder.estimated_cost !== null || workOrder.actual_cost !== null) && (
              <div className="flex items-center gap-1.5 text-theme-tertiary">
                <DollarSign className="w-3.5 h-3.5" />
                {workOrder.estimated_cost !== null && <span>Est: £{workOrder.estimated_cost.toFixed(2)}</span>}
                {workOrder.actual_cost !== null && <span className="font-medium text-theme-primary">Actual: £{workOrder.actual_cost.toFixed(2)}</span>}
              </div>
            )}
          </div>

          {/* Resolution */}
          {workOrder.resolution_notes && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-0.5">Resolution</p>
              <p className="text-sm text-theme-secondary">{workOrder.resolution_notes}</p>
            </div>
          )}

          {/* Photos */}
          {(workOrder.before_photos.length > 0 || workOrder.after_photos.length > 0) && (
            <div className="space-y-2">
              {workOrder.before_photos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-theme-secondary mb-1">Before Photos</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {workOrder.before_photos.map((p, i) => (
                      <img key={i} src={p.url} alt={p.caption || 'Before'} className="h-16 w-16 object-cover rounded-lg border border-theme" />
                    ))}
                  </div>
                </div>
              )}
              {workOrder.after_photos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-theme-secondary mb-1">After Photos</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {workOrder.after_photos.map((p, i) => (
                      <img key={i} src={p.url} alt={p.caption || 'After'} className="h-16 w-16 object-cover rounded-lg border border-theme" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {workOrder.timeline.length > 0 && (
            <div>
              <p className="text-xs font-medium text-theme-secondary mb-2">Timeline</p>
              <WorkOrderTimeline timeline={workOrder.timeline} />
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-medium text-theme-secondary mb-2">Comments</p>
            <WorkOrderComments
              comments={comments}
              onAddComment={handleAddComment}
              loading={loadingComments}
            />
          </div>

          {/* Status Actions */}
          {statusConfig.nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-theme">
              {statusConfig.nextStatuses.map(nextStatus => {
                const nextConfig = WO_STATUS_CONFIG[nextStatus];
                return (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusChange(nextStatus)}
                    disabled={changingStatus}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-theme hover:bg-theme-hover disabled:opacity-50 ${nextConfig.colour}`}
                  >
                    {changingStatus ? '...' : `→ ${nextConfig.label}`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
