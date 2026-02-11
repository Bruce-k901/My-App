'use client';

import { useState, useEffect } from 'react';
import { X, Download, AlertTriangle, Calendar, MapPin, User, FileText, Phone, CheckCircle2, XCircle, Search, ClipboardList, Pencil, ArrowRight } from '@/components/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  location?: string;
  incident_date?: string;
  reported_date?: string;
  reported_at?: string;
  reported_by?: string;
  reported_by_name?: string;
  casualties?: any[];
  witnesses?: any[];
  emergency_services_called?: boolean;
  emergency_services_type?: string;
  first_aid_provided?: boolean;
  scene_preserved?: boolean;
  riddor_reportable?: boolean;
  riddor_reported?: boolean;
  riddor_reported_date?: string;
  riddor_reference?: string;
  riddor_category?: string;
  riddor_due_date?: string;
  riddor_notes?: string;
  riddor_reason?: string;
  riddor_notified_at?: string;
  lost_time_days?: number | null;
  hospitalisation?: boolean;
  public_involved?: boolean;
  reportable_disease?: boolean;
  environmental_release?: boolean;
  photos?: string[];
  documents?: string[];
  immediate_actions_taken?: string;
  investigation_notes?: string;
  root_cause?: string;
  corrective_actions?: string;
  follow_up_tasks?: string[];
  site_id?: string;
  site_name?: string;
  [key: string]: any;
}

interface FollowUpTask {
  id: string;
  status: string;
  priority?: string;
  due_date?: string;
  task_data?: any;
}

interface IncidentReportViewerProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (incident: Incident) => void;
  onUpdate?: () => void;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['investigating'],
  investigating: ['resolved', 'open'],
  resolved: ['closed', 'investigating'],
  closed: ['investigating'],
};

function getStatusActionLabel(status: string): string {
  switch (status) {
    case 'investigating': return 'Begin Investigation';
    case 'resolved': return 'Mark Resolved';
    case 'closed': return 'Close Incident';
    case 'open': return 'Reopen';
    default: return status;
  }
}

function getStatusActionIcon(status: string) {
  switch (status) {
    case 'investigating': return <Search className="w-4 h-4 mr-1.5" />;
    case 'resolved': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
    case 'closed': return <XCircle className="w-4 h-4 mr-1.5" />;
    case 'open': return <ArrowRight className="w-4 h-4 mr-1.5" />;
    default: return null;
  }
}

function getStatusBadgeColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'open':
      return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/40';
    case 'investigating':
      return 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/40';
    case 'resolved':
      return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/40';
    case 'closed':
      return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500/40';
    default:
      return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500/40';
  }
}

function getTaskStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300';
    case 'pending':
      return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
    case 'in_progress':
      return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300';
    case 'overdue':
      return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300';
    default:
      return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
  }
}

export function IncidentReportViewer({ incident, isOpen, onClose, onDownload, onUpdate }: IncidentReportViewerProps) {
  const [fullIncident, setFullIncident] = useState<Incident | null>(incident);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable investigation fields
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');

  // Follow-up tasks
  const [followUpTaskDetails, setFollowUpTaskDetails] = useState<FollowUpTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (isOpen && incident?.id) {
      loadFullIncident();
    } else {
      setFullIncident(incident);
    }
  }, [isOpen, incident?.id]);

  // Sync editable fields when fullIncident changes
  useEffect(() => {
    if (fullIncident) {
      setInvestigationNotes(fullIncident.investigation_notes || '');
      setRootCause(fullIncident.root_cause || '');
      setCorrectiveActions(fullIncident.corrective_actions || '');
    }
  }, [fullIncident]);

  async function loadFullIncident() {
    if (!incident?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incident.id)
        .single();

      if (error) throw error;

      // Fetch site name if site_id exists
      if (data.site_id) {
        const { data: siteData } = await supabase
          .from('sites')
          .select('name')
          .eq('id', data.site_id)
          .single();

        if (siteData) {
          data.site_name = siteData.name;
        }
      }

      // Fetch reported_by name if reported_by exists
      if (data.reported_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.reported_by)
          .single();

        if (profileData) {
          data.reported_by_name = profileData.full_name || profileData.email || 'Unknown';
        }
      }

      setFullIncident(data);

      // Fetch follow-up tasks if they exist
      if (data.follow_up_tasks && Array.isArray(data.follow_up_tasks) && data.follow_up_tasks.length > 0) {
        loadFollowUpTasks(data.follow_up_tasks);
      } else {
        setFollowUpTaskDetails([]);
      }
    } catch (error: any) {
      console.error('Error loading incident:', error);
      toast.error('Failed to load incident details');
      setFullIncident(incident); // Fallback to provided incident
    } finally {
      setLoading(false);
    }
  }

  async function loadFollowUpTasks(taskIds: string[]) {
    if (!taskIds || taskIds.length === 0) {
      setFollowUpTaskDetails([]);
      return;
    }
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('id, status, task_data, due_date, priority')
        .in('id', taskIds);

      if (error) throw error;
      setFollowUpTaskDetails(data || []);
    } catch (error) {
      console.error('Error loading follow-up tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!fullIncident?.id) return;
    setSaving(true);
    try {
      // Ensure we have a valid session before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          toast.error('Your session has expired. Please log in again.');
          return;
        }
      }

      // Only send status - keep investigation saves separate via "Save Investigation" button
      const { data, error } = await supabase
        .from('incidents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', fullIncident.id)
        .select();

      if (error) {
        console.error('Supabase update error:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }));
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('Update returned no rows - possible RLS policy issue');
        throw new Error('Update failed - no rows returned. You may not have permission to update this incident.');
      }

      toast.success(`Incident status updated to ${newStatus}`);
      setIsEditing(false);
      await loadFullIncident();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating incident status:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})));
      toast.error(error?.message || 'Failed to update incident status');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveInvestigation() {
    if (!fullIncident?.id) return;
    setSaving(true);
    try {
      // Ensure we have a valid session before saving
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          toast.error('Your session has expired. Please log in again.');
          return;
        }
      }

      const { data, error } = await supabase
        .from('incidents')
        .update({
          investigation_notes: investigationNotes || null,
          root_cause: rootCause || null,
          corrective_actions: correctiveActions || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fullIncident.id)
        .select();

      if (error) {
        console.error('Supabase save error:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }));
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('Save returned no rows - possible RLS policy issue');
        throw new Error('Save failed - no rows returned. You may not have permission to update this incident.');
      }

      toast.success('Investigation details saved');
      setIsEditing(false);
      await loadFullIncident();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving investigation:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})));
      toast.error(error?.message || 'Failed to save investigation details');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setIsEditing(false);
    // Reset to stored values
    if (fullIncident) {
      setInvestigationNotes(fullIncident.investigation_notes || '');
      setRootCause(fullIncident.root_cause || '');
      setCorrectiveActions(fullIncident.corrective_actions || '');
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getSeverityColor(severity: string) {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'fatality':
        return 'text-red-700 dark:text-red-400';
      case 'major':
      case 'high':
        return 'text-orange-700 dark:text-orange-400';
      case 'moderate':
      case 'medium':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'minor':
      case 'low':
      case 'near_miss':
        return 'text-blue-700 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'text-red-700 dark:text-red-400';
      case 'investigating':
        return 'text-orange-700 dark:text-orange-400';
      case 'resolved':
        return 'text-green-700 dark:text-green-400';
      case 'closed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }

  if (!isOpen || !fullIncident) return null;

  const validTransitions = STATUS_TRANSITIONS[fullIncident.status] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#14161c] border-gray-200 dark:border-white/[0.1]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2 text-gray-900 dark:text-white">{fullIncident.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-white/60">
                <span className={`font-medium ${getSeverityColor(fullIncident.severity)}`}>
                  {fullIncident.severity?.toUpperCase() || 'UNKNOWN'}
                </span>
                <span>•</span>
                <span className={`font-medium ${getStatusColor(fullIncident.status)}`}>
                  {fullIncident.status?.toUpperCase() || 'UNKNOWN'}
                </span>
                <span>•</span>
                <span className="capitalize text-gray-900 dark:text-white">{fullIncident.incident_type?.replace(/_/g, ' ') || 'Unknown Type'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-white/60">Loading incident details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Progression Bar */}
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-white/60">Status:</span>
                  <span className={`px-3 py-1 rounded-md text-sm font-medium ${getStatusBadgeColor(fullIncident.status)}`}>
                    {fullIncident.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {validTransitions.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      onClick={() => handleStatusChange(nextStatus)}
                      disabled={saving}
                      size="sm"
                      variant={nextStatus === 'open' ? 'outline' : 'default'}
                      className={
                        nextStatus === 'open'
                          ? 'text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10'
                          : nextStatus === 'closed'
                          ? 'bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600'
                          : 'bg-[#D37E91] hover:bg-[#D37E91]/90 text-white'
                      }
                    >
                      {getStatusActionIcon(nextStatus)}
                      {saving ? 'Updating...' : getStatusActionLabel(nextStatus)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Incident Details */}
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
                Incident Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-gray-500 dark:text-white/40 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-gray-600 dark:text-white/60 mb-1">Description</div>
                    <div className="text-gray-900 dark:text-white">{fullIncident.description || 'No description provided'}</div>
                  </div>
                </div>
                {fullIncident.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-white/40 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-gray-600 dark:text-white/60 mb-1">Location</div>
                      <div className="text-gray-900 dark:text-white">{fullIncident.location}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-white/40 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-gray-600 dark:text-white/60 mb-1">Incident Date & Time</div>
                    <div className="text-gray-900 dark:text-white">{formatDate(fullIncident.incident_date || fullIncident.reported_date || fullIncident.reported_at)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-gray-500 dark:text-white/40 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-gray-600 dark:text-white/60 mb-1">Reported By</div>
                    <div className="text-gray-900 dark:text-white">{fullIncident.reported_by_name || fullIncident.reported_by || 'Unknown'}</div>
                  </div>
                </div>
                {fullIncident.site_name && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-white/40 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-gray-600 dark:text-white/60 mb-1">Site</div>
                      <div className="text-gray-900 dark:text-white">{fullIncident.site_name}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Casualties */}
            {fullIncident.casualties && Array.isArray(fullIncident.casualties) && fullIncident.casualties.length > 0 && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-gray-700 dark:text-white" />
                  Casualties ({fullIncident.casualties.length})
                </h3>
                <div className="space-y-3">
                  {fullIncident.casualties.map((casualty: any, index: number) => (
                    <div key={index} className="bg-white dark:bg-white/[0.05] rounded p-3 border border-gray-200 dark:border-white/[0.06]">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Name: </span>
                          <span className="text-gray-900 dark:text-white">{casualty.name || 'Not specified'}</span>
                        </div>
                        {casualty.age && (
                          <div>
                            <span className="text-gray-600 dark:text-white/60">Age: </span>
                            <span className="text-gray-900 dark:text-white">{casualty.age}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Injury: </span>
                          <span className="text-gray-900 dark:text-white">{casualty.injury_type || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Severity: </span>
                          <span className="text-gray-900 dark:text-white">{casualty.severity || 'Not specified'}</span>
                        </div>
                        {casualty.treatment_required && (
                          <div className="col-span-2">
                            <span className="text-gray-600 dark:text-white/60">Treatment: </span>
                            <span className="text-gray-900 dark:text-white">{casualty.treatment_required}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Witnesses */}
            {fullIncident.witnesses && Array.isArray(fullIncident.witnesses) && fullIncident.witnesses.length > 0 && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-700 dark:text-white" />
                  Witnesses ({fullIncident.witnesses.length})
                </h3>
                <div className="space-y-3">
                  {fullIncident.witnesses.map((witness: any, index: number) => (
                    <div key={index} className="bg-white dark:bg-white/[0.05] rounded p-3 border border-gray-200 dark:border-white/[0.06]">
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Name: </span>
                          <span className="text-gray-900 dark:text-white">{witness.name || 'Not specified'}</span>
                        </div>
                        {witness.contact && (
                          <div>
                            <span className="text-gray-600 dark:text-white/60">Contact: </span>
                            <span className="text-gray-900 dark:text-white">{witness.contact}</span>
                          </div>
                        )}
                        {witness.statement && (
                          <div>
                            <span className="text-gray-600 dark:text-white/60">Statement: </span>
                            <div className="text-gray-900 dark:text-white mt-1">{witness.statement}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Response */}
            {(fullIncident.emergency_services_called || fullIncident.first_aid_provided || fullIncident.scene_preserved) && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-700 dark:text-white" />
                  Emergency Response
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {fullIncident.emergency_services_called ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className="text-gray-900 dark:text-white">
                      Emergency Services Called: {fullIncident.emergency_services_called ? 'Yes' : 'No'}
                      {fullIncident.emergency_services_type && ` (${fullIncident.emergency_services_type})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fullIncident.first_aid_provided ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className="text-gray-900 dark:text-white">First Aid Provided: {fullIncident.first_aid_provided ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fullIncident.scene_preserved ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className="text-gray-900 dark:text-white">Scene Preserved: {fullIncident.scene_preserved ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Immediate Actions */}
            {fullIncident.immediate_actions_taken && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Immediate Actions Taken</h3>
                <div className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">{fullIncident.immediate_actions_taken}</div>
              </div>
            )}

            {/* Investigation Section */}
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-700 dark:text-white" />
                  Investigation
                </h3>
                {!isEditing && fullIncident.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Investigation Notes */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white/60 mb-1.5 block">Investigation Notes</label>
                  {isEditing ? (
                    <textarea
                      value={investigationNotes}
                      onChange={(e) => setInvestigationNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 text-sm"
                      placeholder="Record investigation findings..."
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">
                      {fullIncident.investigation_notes || <span className="text-gray-400 dark:text-white/30 italic">No investigation notes yet</span>}
                    </div>
                  )}
                </div>

                {/* Root Cause */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white/60 mb-1.5 block">Root Cause</label>
                  {isEditing ? (
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 text-sm"
                      placeholder="What was the root cause?"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">
                      {fullIncident.root_cause || <span className="text-gray-400 dark:text-white/30 italic">Not identified yet</span>}
                    </div>
                  )}
                </div>

                {/* Corrective Actions */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-white/60 mb-1.5 block">Corrective Actions</label>
                  {isEditing ? (
                    <textarea
                      value={correctiveActions}
                      onChange={(e) => setCorrectiveActions(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 text-sm"
                      placeholder="What corrective actions are being taken?"
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap">
                      {fullIncident.corrective_actions || <span className="text-gray-400 dark:text-white/30 italic">None specified yet</span>}
                    </div>
                  )}
                </div>

                {/* Save/Cancel buttons when editing */}
                {isEditing && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      onClick={handleSaveInvestigation}
                      disabled={saving}
                      size="sm"
                      className="bg-[#D37E91] hover:bg-[#D37E91]/90 text-white"
                    >
                      {saving ? 'Saving...' : 'Save Investigation'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-Up Tasks */}
            {fullIncident.follow_up_tasks && Array.isArray(fullIncident.follow_up_tasks) && fullIncident.follow_up_tasks.length > 0 && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-gray-700 dark:text-white" />
                  Follow-Up Tasks ({followUpTaskDetails.length})
                </h3>
                {loadingTasks ? (
                  <p className="text-sm text-gray-600 dark:text-white/60">Loading tasks...</p>
                ) : followUpTaskDetails.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-white/30 italic">Tasks could not be loaded</p>
                ) : (
                  <div className="space-y-2">
                    {followUpTaskDetails.map((task) => (
                      <div key={task.id} className="bg-white dark:bg-white/[0.05] rounded p-3 border border-gray-200 dark:border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {task.task_data?.label || task.task_data?.task_description || task.task_data?.task_type?.replace(/_/g, ' ') || 'Follow-up task'}
                            </div>
                            {task.due_date && (
                              <div className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                                Due: {formatDate(task.due_date)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {task.priority && (
                              <span className="text-xs text-gray-500 dark:text-white/40 capitalize">{task.priority}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                              {task.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RIDDOR Information */}
            {fullIncident.riddor_reportable && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  RIDDOR Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-white/60">Reportable: </span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">Yes</span>
                  </div>
                  {fullIncident.riddor_category && (
                    <div>
                      <span className="text-gray-600 dark:text-white/60">Category: </span>
                      <span className="text-gray-900 dark:text-white capitalize">{fullIncident.riddor_category.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {fullIncident.riddor_reason && (
                    <div>
                      <span className="text-gray-600 dark:text-white/60">Reason: </span>
                      <span className="text-gray-900 dark:text-white">{fullIncident.riddor_reason}</span>
                    </div>
                  )}
                  {fullIncident.riddor_due_date && (
                    <div>
                      <span className="text-gray-600 dark:text-white/60">Reporting Deadline: </span>
                      <span className="text-gray-900 dark:text-white">{formatDate(fullIncident.riddor_due_date)}</span>
                    </div>
                  )}
                  {fullIncident.riddor_reported && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-white/60">Reported to HSE: </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                      </div>
                      {fullIncident.riddor_reported_date && (
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Reported Date: </span>
                          <span className="text-gray-900 dark:text-white">{formatDate(fullIncident.riddor_reported_date)}</span>
                        </div>
                      )}
                      {fullIncident.riddor_reference && (
                        <div>
                          <span className="text-gray-600 dark:text-white/60">Reference: </span>
                          <span className="text-gray-900 dark:text-white">{fullIncident.riddor_reference}</span>
                        </div>
                      )}
                    </>
                  )}
                  {!fullIncident.riddor_reported && (
                    <div>
                      <span className="text-gray-600 dark:text-white/60">Reported to HSE: </span>
                      <span className="text-red-600 dark:text-red-400 font-medium">Not yet</span>
                    </div>
                  )}
                  {fullIncident.riddor_notes && (
                    <div>
                      <span className="text-gray-600 dark:text-white/60">Assessment Notes: </span>
                      <div className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{fullIncident.riddor_notes}</div>
                    </div>
                  )}

                  {/* RIDDOR Trigger Details */}
                  <div className="border-t border-gray-200 dark:border-white/[0.06] pt-3 mt-3">
                    <div className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wide mb-2">
                      Trigger Details
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {fullIncident.lost_time_days != null && fullIncident.lost_time_days > 0 && (
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-white/60">Lost Time: </span>
                          <span className="text-gray-900 dark:text-white">{fullIncident.lost_time_days} days</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {fullIncident.hospitalisation ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-white/20" />
                        )}
                        <span className="text-gray-900 dark:text-white">Hospitalisation</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fullIncident.public_involved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-white/20" />
                        )}
                        <span className="text-gray-900 dark:text-white">Public Involved</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fullIncident.reportable_disease ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-white/20" />
                        )}
                        <span className="text-gray-900 dark:text-white">Reportable Disease</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fullIncident.environmental_release ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-white/20" />
                        )}
                        <span className="text-gray-900 dark:text-white">Environmental Release</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence */}
            {((fullIncident.photos && fullIncident.photos.length > 0) || (fullIncident.documents && fullIncident.documents.length > 0)) && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evidence</h3>
                <div className="space-y-3">
                  {fullIncident.photos && fullIncident.photos.length > 0 && (
                    <div>
                      <div className="text-gray-600 dark:text-white/60 text-sm mb-2">Photos ({fullIncident.photos.length})</div>
                      <div className="grid grid-cols-2 gap-2">
                        {fullIncident.photos.map((photo: string, index: number) => (
                          <a
                            key={index}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm break-all"
                          >
                            Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {fullIncident.documents && fullIncident.documents.length > 0 && (
                    <div>
                      <div className="text-gray-600 dark:text-white/60 text-sm mb-2">Documents ({fullIncident.documents.length})</div>
                      <div className="space-y-1">
                        {fullIncident.documents.map((doc: string, index: number) => (
                          <a
                            key={index}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm break-all"
                          >
                            Document {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <Button
                onClick={onClose}
                variant="outline"
                className="text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Close
              </Button>
              {onDownload && (
                <Button
                  onClick={() => onDownload(fullIncident)}
                  className="bg-[#D37E91] hover:bg-[#D37E91]/90 text-white dark:bg-transparent dark:text-[#D37E91] dark:border-[#D37E91] dark:hover:shadow-[0_0_12px_rgba(211,126,145,0.7)] transition-all duration-200 ease-in-out"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
