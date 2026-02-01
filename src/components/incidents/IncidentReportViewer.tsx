'use client';

import { useState, useEffect } from 'react';
import { X, Download, AlertTriangle, Calendar, MapPin, User, FileText, Phone, CheckCircle2, XCircle } from 'lucide-react';
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
  photos?: string[];
  documents?: string[];
  immediate_actions_taken?: string;
  site_id?: string;
  site_name?: string;
  [key: string]: any; // For any additional fields
}

interface IncidentReportViewerProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (incident: Incident) => void;
}

export function IncidentReportViewer({ incident, isOpen, onClose, onDownload }: IncidentReportViewerProps) {
  const [fullIncident, setFullIncident] = useState<Incident | null>(incident);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && incident?.id) {
      loadFullIncident();
    } else {
      setFullIncident(incident);
    }
  }, [isOpen, incident?.id]);

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
    } catch (error: any) {
      console.error('Error loading incident:', error);
      toast.error('Failed to load incident details');
      setFullIncident(incident); // Fallback to provided incident
    } finally {
      setLoading(false);
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
                <span className="capitalize text-gray-900 dark:text-white">{fullIncident.incident_type?.replace('_', ' ') || 'Unknown Type'}</span>
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

            {/* RIDDOR Information */}
            {fullIncident.riddor_reportable && (
              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  RIDDOR Reportable
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-white/60">Reportable: </span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium">Yes</span>
                  </div>
                  {fullIncident.riddor_reported && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-white/60">Reported: </span>
                        <span className="text-gray-900 dark:text-white">Yes</span>
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
                  className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white dark:bg-transparent dark:text-[#EC4899] dark:border-[#EC4899] dark:hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all duration-200 ease-in-out"
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















