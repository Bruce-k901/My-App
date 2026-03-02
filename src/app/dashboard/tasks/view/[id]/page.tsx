"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  Camera, 
  FileText, 
  AlertTriangle,
  Thermometer,
  Loader2,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  Building2,
  Tag,
  X
} from '@/components/ui/icons';
import { ChecklistTaskWithTemplate } from '@/types/checklist-types';
import TaskCompletionModal from '@/components/checklists/TaskCompletionModal';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { useTaskWaste } from '@/hooks/useModuleReferences';

type TaskCompletionRecord = {
  id: string;
  completed_at: string;
  completed_by: string;
  completion_data: Record<string, any>;
  evidence_attachments: string[];
  duration_seconds: number | null;
  flagged: boolean;
  flag_reason: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyId, siteId } = useAppContext();
  const taskId = params?.id as string;

  const [task, setTask] = useState<ChecklistTaskWithTemplate | null>(null);
  const [completionRecords, setCompletionRecords] = useState<TaskCompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['details']));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Get linked waste records for this task
  const { data: linkedWaste, isLoading: loadingWaste } = useTaskWaste(taskId);

  useEffect(() => {
    if (taskId && companyId) {
      fetchTaskDetails();
    }
  }, [taskId, companyId, siteId]);

  async function fetchTaskDetails() {
    if (!taskId || !companyId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch task with template
      const { data: taskData, error: taskError } = await supabase
        .from('checklist_tasks')
        .select(`
          *,
          template: task_templates(*)
        `)
        .eq('id', taskId)
        .eq('company_id', companyId)
        .single();

      if (taskError) throw taskError;
      if (!taskData) {
        setError('Task not found');
        setLoading(false);
        return;
      }

      setTask(taskData as ChecklistTaskWithTemplate);

      // Fetch all completion records for this task
      const { data: recordsData, error: recordsError } = await supabase
        .from('task_completion_records')
        .select(`
          *,
          profiles:completed_by(full_name, email)
        `)
        .eq('task_id', taskId)
        .order('completed_at', { ascending: false });

      if (recordsError) {
        console.warn('Error fetching completion records:', recordsError);
      } else {
        setCompletionRecords((recordsData || []) as TaskCompletionRecord[]);
      }

    } catch (err: any) {
      console.error('Error fetching task details:', err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleTaskComplete = () => {
    fetchTaskDetails(); // Refresh task data
    setShowCompletionModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full items-center">
        <div className="w-full max-w-[1280px] px-6 md:px-8 lg:px-12 flex flex-col gap-6 text-theme-primary py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-module-fg animate-spin mr-3" />
            <span className="text-theme-tertiary">Loading task details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col w-full items-center">
        <div className="w-full max-w-[1280px] px-6 md:px-8 lg:px-12 flex flex-col gap-6 text-theme-primary py-8">
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">Error Loading Task</h3>
            <p className="text-theme-tertiary mb-6">{error || 'Task not found'}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] rounded-lg transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';
  const isOverdue = (() => {
    if (task.status !== 'pending') return false;
    const now = new Date();
    if (task.due_time) {
      // Has a specific time — only overdue after that time
      return now > new Date(`${task.due_date}T${task.due_time}`);
    }
    // No specific time — only overdue if due date is before today
    return task.due_date < now.toISOString().split('T')[0];
  })();
  const taskName = task.custom_name || task.template?.name || 'Unknown Task';
  const latestCompletion = completionRecords[0];
  const template = task.template || null;

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1280px] px-6 md:px-8 lg:px-12 flex flex-col gap-6 text-theme-primary py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-theme-primary">{taskName}</h1>
            <p className="text-theme-tertiary mt-1">
              {template?.category || 'General'} • {template?.is_critical ? 'Critical' : 'Standard'} Task
            </p>
          </div>
          {!isCompleted && (
            <button
              onClick={() => setShowCompletionModal(true)}
              className="px-6 py-3 bg-transparent border border-module-fg text-module-fg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Complete Task
            </button>
          )}
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl p-4 border ${
          isCompleted 
            ? 'bg-green-500/10 border-green-500/40' 
            : isOverdue 
            ? 'bg-red-500/10 border-red-500/40'
            : 'bg-yellow-500/10 border-yellow-500/40'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : isOverdue ? (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              ) : (
                <Clock className="w-6 h-6 text-yellow-400" />
              )}
              <div>
                <div className="font-semibold text-theme-primary">
                  {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                </div>
                <div className="text-sm text-theme-tertiary">
                  {isCompleted && latestCompletion
                    ? `Completed ${formatDistanceToNow(new Date(latestCompletion.completed_at), { addSuffix: true })}`
                    : `Due: ${format(new Date(task.due_date), 'dd MMM yyyy')}${task.due_time ? ` at ${task.due_time}` : ''}`
                  }
                </div>
              </div>
            </div>
            {template?.is_critical && (
              <div className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-medium">
                Critical Task
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Details */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <button
                onClick={() => toggleSection('details')}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-xl font-semibold text-theme-primary">Task Details</h2>
                {expandedSections.has('details') ? (
                  <ChevronUp className="w-5 h-5 text-theme-tertiary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-theme-tertiary" />
                )}
              </button>

              {expandedSections.has('details') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-theme-tertiary mb-1">Due Date</div>
                      <div className="text-theme-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(task.due_date), 'dd MMM yyyy')}
                        {task.due_time && (
                          <span className="text-theme-tertiary">at {task.due_time}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-theme-tertiary mb-1">Status</div>
                      <div className="text-theme-primary flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${
                          isCompleted ? 'text-green-400' : isOverdue ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </div>
                    </div>
                    {task.daypart && (
                      <div>
                        <div className="text-sm text-theme-tertiary mb-1">Daypart</div>
                        <div className="text-theme-primary capitalize">{task.daypart}</div>
                      </div>
                    )}
                    {task.priority && (
                      <div>
                        <div className="text-sm text-theme-tertiary mb-1">Priority</div>
                        <div className="text-theme-primary capitalize">{task.priority}</div>
                      </div>
                    )}
                    {template?.category && (
                      <div>
                        <div className="text-sm text-theme-tertiary mb-1">Category</div>
                        <div className="text-theme-primary">{template.category}</div>
                      </div>
                    )}
                  </div>

                  {task.template_notes && (
                    <div>
                      <div className="text-sm text-theme-tertiary mb-2">Task Notes</div>
                      <div className="text-theme-primary bg-white/[0.05] rounded-lg p-3">
                        {task.template_notes}
                      </div>
                    </div>
                  )}

                  {task.template?.description && (
                    <div>
                      <div className="text-sm text-theme-tertiary mb-2">Description</div>
                      <div className="text-theme-secondary bg-white/[0.05] rounded-lg p-3">
                        {task.template.description}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Completion History */}
            {completionRecords.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <button
                  onClick={() => toggleSection('history')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <h2 className="text-xl font-semibold text-theme-primary">
                    Completion History ({completionRecords.length})
                  </h2>
                  {expandedSections.has('history') ? (
                    <ChevronUp className="w-5 h-5 text-theme-tertiary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-theme-tertiary" />
                  )}
                </button>

                {expandedSections.has('history') && (
                  <div className="space-y-4">
                    {completionRecords.map((record) => (
                      <CompletionRecordCard key={record.id} record={record} task={task} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Latest Completion Details */}
            {latestCompletion && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-theme-primary mb-4">Latest Completion Details</h2>
                <CompletionDetails record={latestCompletion} task={task} />
              </div>
            )}

            {/* Linked Waste Records */}
            {(linkedWaste && linkedWaste.length > 0) && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <button
                  onClick={() => toggleSection('waste')}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <h2 className="text-xl font-semibold text-theme-primary">
                    Waste Generated ({linkedWaste.length})
                  </h2>
                  {expandedSections.has('waste') ? (
                    <ChevronUp className="w-5 h-5 text-theme-tertiary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-theme-tertiary" />
                  )}
                </button>

                {expandedSections.has('waste') && (
                  <div className="space-y-3">
                    {linkedWaste.map((ref) => (
                      <Link
                        key={ref.link_id}
                        href={`/dashboard/stockly/waste?id=${ref.target_id}`}
                        className="block bg-white/[0.05] border border-white/[0.1] rounded-lg p-4 hover:bg-white/[0.08] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-orange-400" />
                              <span className="font-semibold text-theme-primary">
                                Waste Record #{ref.target_id.slice(0, 8)}
                              </span>
                              {ref.link_type && (
                                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-xs">
                                  {ref.link_type.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-theme-tertiary">
                              Linked: {format(new Date(ref.created_at), 'dd MMM yyyy HH:mm')}
                            </div>
                            {ref.metadata && Object.keys(ref.metadata).length > 0 && (
                              <div className="text-xs text-theme-tertiary mt-2">
                                {ref.metadata.cost && `Cost: £${ref.metadata.cost.toFixed(2)}`}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-theme-tertiary" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-theme-primary mb-4">Quick Info</h3>
              <div className="space-y-3">
                {task.template?.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-theme-tertiary" />
                    <span className="text-sm text-theme-tertiary">Category:</span>
                    <span className="text-sm text-theme-primary">{task.template.category}</span>
                  </div>
                )}
                {latestCompletion?.profiles?.full_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-theme-tertiary" />
                    <span className="text-sm text-theme-tertiary">Last completed by:</span>
                    <span className="text-sm text-theme-primary">{latestCompletion.profiles.full_name}</span>
                  </div>
                )}
                {latestCompletion?.duration_seconds && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-theme-tertiary" />
                    <span className="text-sm text-theme-tertiary">Duration:</span>
                    <span className="text-sm text-theme-primary">
                      {Math.floor(latestCompletion.duration_seconds / 60)} minutes
                    </span>
                  </div>
                )}
                {latestCompletion?.evidence_attachments?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-theme-tertiary" />
                    <span className="text-sm text-theme-tertiary">Evidence:</span>
                    <span className="text-sm text-theme-primary">
                      {latestCompletion.evidence_attachments.length} file(s)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Info */}
            {template && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-theme-primary mb-4">Template Info</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-theme-tertiary">Frequency:</span>
                    <span className="text-theme-primary ml-2 capitalize">{template.frequency || 'N/A'}</span>
                  </div>
                  {template.role_required && (
                    <div>
                      <span className="text-theme-tertiary">Role Required:</span>
                      <span className="text-theme-primary ml-2 capitalize">{template.role_required}</span>
                    </div>
                  )}
                  {template.compliance_standard && (
                    <div>
                      <span className="text-theme-tertiary">Compliance:</span>
                      <span className="text-theme-primary ml-2">{template.compliance_standard}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Completion Modal */}
      {showCompletionModal && task && (
        <TaskCompletionModal
          task={task}
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          onComplete={handleTaskComplete}
        />
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg text-theme-primary z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CompletionRecordCard({ 
  record, 
  task 
}: { 
  record: TaskCompletionRecord; 
  task: ChecklistTaskWithTemplate;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-theme-primary">
              {format(new Date(record.completed_at), 'dd MMM yyyy HH:mm')}
            </span>
            {record.flagged && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                Flagged
              </span>
            )}
          </div>
          <div className="text-sm text-theme-tertiary mb-2">
            Completed by: {record.profiles?.full_name || 'Unknown'}
            {record.duration_seconds && (
              <span className="ml-3">
                • Duration: {Math.floor(record.duration_seconds / 60)} minutes
              </span>
            )}
          </div>
          {record.flag_reason && (
            <div className="text-sm text-orange-400 mb-2">
              Flag Reason: {record.flag_reason}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-white/10 rounded"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-theme-tertiary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-theme-tertiary" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <CompletionDetails record={record} task={task} />
        </div>
      )}
    </div>
  );
}

function CompletionDetails({ 
  record, 
  task 
}: { 
  record: TaskCompletionRecord; 
  task: ChecklistTaskWithTemplate;
}) {
  const completionData = record.completion_data || {};
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Extract equipment/temperature data
  const equipmentList = completionData.equipment_list || [];
  const checklistItems = completionData.checklist_items || [];
  const yesNoItems = completionData.yes_no_checklist_items || [];

  return (
    <div className="space-y-4">
      {/* Equipment & Temperatures */}
      {equipmentList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            Equipment & Temperature Readings
          </h4>
          <div className="space-y-2">
            {equipmentList.map((eq: any, idx: number) => (
              <div key={idx} className="bg-white/[0.05] rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-theme-primary font-medium">
                    {eq.asset_name || eq.name || `Equipment ${idx + 1}`}
                  </span>
                  {eq.temperature !== undefined && eq.temperature !== null && (
                    <span className={`font-semibold ${
                      eq.status === 'out_of_range' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {eq.temperature}°C
                    </span>
                  )}
                </div>
                {eq.status && (
                  <div className="text-xs text-theme-tertiary mt-1">
                    Status: <span className="capitalize">{eq.status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Items */}
      {checklistItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Checklist Items
          </h4>
          <div className="space-y-1">
            {checklistItems.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {item.checked ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="text-theme-secondary">{item.label || item.name || `Item ${idx + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yes/No Checklist */}
      {yesNoItems.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-theme-primary mb-2">Yes/No Checklist</h4>
          <div className="space-y-1">
            {yesNoItems.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {item.value === true || item.value === 'yes' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="text-theme-secondary">{item.label || item.question || `Question ${idx + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {completionData.notes && (
        <div>
          <h4 className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notes
          </h4>
          <div className="bg-white/[0.05] rounded-lg p-3 text-sm text-theme-secondary">
            {completionData.notes}
          </div>
        </div>
      )}

      {/* Evidence Attachments */}
      {record.evidence_attachments && record.evidence_attachments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-theme-primary mb-2 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Evidence ({record.evidence_attachments.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {record.evidence_attachments.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-square bg-white/[0.05] rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setSelectedImage(url)}
              >
                <img
                  src={url}
                  alt={`Evidence ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-theme-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg text-theme-primary z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

