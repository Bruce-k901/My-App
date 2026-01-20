'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { EmergencyIncidentModal } from '@/components/incidents/EmergencyIncidentModal';
import { IncidentReportViewer } from '@/components/incidents/IncidentReportViewer';
import { downloadIncidentReportPDF } from '@/lib/incident-report-pdf';
import Select from '@/components/ui/Select';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'near_miss' | 'minor' | 'moderate' | 'major' | 'critical' | 'fatality' | 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reported_by: string;
  reported_date: string;
  reported_at?: string; // Legacy field name support
  site_id?: string;
  site_name?: string;
}

export default function IncidentsPage() {
  const { companyId, siteId } = useAppContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, [companyId, siteId]);

  async function fetchIncidents() {
    try {
      setLoading(true);
      
      if (!companyId) {
        console.warn('No company ID available');
        setIncidents([]);
        return;
      }
      
      // Fetch incidents - try with sites relationship first
      // If relationship query fails, we'll fetch sites separately
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('company_id', companyId)
        .order('reported_date', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        // Try to get more details about the error
        const errorDetails: any = {
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        };
        
        // Try to serialize the error object
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error';
        }
        
        // Try to get error as string
        try {
          errorDetails.errorString = String(error);
        } catch (e) {
          errorDetails.errorString = 'Could not convert to string';
        }
        
        console.error('Supabase error:', errorDetails);
        throw error;
      }

      // Get unique site IDs from incidents
      const siteIds = [...new Set((data || []).map((incident: any) => incident.site_id).filter(Boolean))];
      
      // Fetch sites separately if we have site IDs
      let sitesMap: Record<string, { id: string; name: string }> = {};
      if (siteIds.length > 0) {
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds)
          .eq('company_id', companyId);
        
        if (!sitesError && sitesData) {
          sitesMap = sitesData.reduce((acc: Record<string, { id: string; name: string }>, site: any) => {
            acc[site.id] = { id: site.id, name: site.name };
            return acc;
          }, {});
        }
      }
      
      // Transform data to include site name
      const incidentsWithSites = (data || []).map((incident: any) => {
        // Get site name from the map
        const site = incident.site_id ? sitesMap[incident.site_id] : null;
        
        // Also try to get reported_by name if available
        const reportedByName = incident.reported_by_profile?.full_name || 
                              incident.reported_by_profile?.email || 
                              'Unknown';
        
        return {
          ...incident,
          site_name: site?.name || 'No site assigned',
          severity: incident.severity || 'near_miss',
          status: incident.status || 'open',
          reported_by: reportedByName
        };
      });

      setIncidents(incidentsWithSites);
    } catch (error: any) {
      // Enhanced error logging
      const errorDetails: any = {
        error,
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      };
      
      // Try to serialize the error object
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error';
      }
      
      // Try to get error as string
      try {
        errorDetails.errorString = String(error);
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string';
      }
      
      console.error('Error fetching incidents:', errorDetails);
      
      const errorMessage = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to load incidents: ${errorMessage}`);
      setIncidents([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'fatality':
        return 'bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-600/40';
      case 'major':
      case 'high':
        return 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/40';
      case 'minor':
      case 'low':
      case 'near_miss':
        return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40';
      default:
        return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-500/40';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40';
      case 'investigating':
        return 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40';
      case 'resolved':
        return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40';
      case 'closed':
        return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-500/40';
      default:
        return 'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-500/40';
    }
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-[#0B0D13] min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-pink-400" />
              Incident Reports
            </h1>
            <p className="text-gray-600 dark:text-white/60">Track and manage safety incidents and accidents</p>
          </div>
          <Button
            onClick={() => setIsIncidentModalOpen(true)}
            className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white dark:bg-red-600 dark:hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50 dark:focus:ring-pink-500"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
              placeholder="All Statuses"
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Open', value: 'open' },
                { label: 'Investigating', value: 'investigating' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Closed', value: 'closed' },
              ]}
              className="w-full md:w-[180px]"
            />

            {/* Severity Filter */}
            <Select
              value={severityFilter}
              onValueChange={(value) => setSeverityFilter(value)}
              placeholder="All Severities"
              options={[
                { label: 'All Severities', value: 'all' },
                { label: 'Critical', value: 'critical' },
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
                { label: 'Near Miss', value: 'near_miss' },
                { label: 'Minor', value: 'minor' },
                { label: 'Moderate', value: 'moderate' },
                { label: 'Major', value: 'major' },
                { label: 'Fatality', value: 'fatality' },
              ]}
              className="w-full md:w-[180px]"
            />
          </div>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-white/60">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No incidents found</h3>
            <p className="text-gray-600 dark:text-white/60 mb-6">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No incidents have been reported yet'}
            </p>
            {!searchTerm && statusFilter === 'all' && severityFilter === 'all' && (
              <Button
                onClick={() => setIsIncidentModalOpen(true)}
                className="bg-[#EC4899] hover:bg-[#EC4899]/90 text-white dark:bg-red-600 dark:hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Report First Incident
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.1] rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{incident.title}</h3>
                    <p className="text-gray-700 dark:text-white/70 text-sm mb-3">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-white/50">
                      <span>Reported by: {incident.reported_by}</span>
                      <span>•</span>
                      <span>{new Date(incident.reported_date || incident.reported_at).toLocaleDateString()}</span>
                      {incident.site_name && (
                        <>
                          <span>•</span>
                          <span>{incident.site_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                      {(incident.severity || 'UNKNOWN').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getStatusColor(incident.status)}`}>
                      {(incident.status || 'UNKNOWN').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
                  <Button
                    onClick={() => {
                      setViewingIncident(incident);
                      setIsViewerOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        await downloadIncidentReportPDF(incident);
                        toast.success('Report download started');
                      } catch (error: any) {
                        console.error('Error downloading report:', error);
                        toast.error(error.message || 'Failed to download report');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-700 dark:text-white border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency Incident Modal */}
      <EmergencyIncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setSelectedIncident(null);
        }}
        onComplete={(incidentId) => {
          // Refresh incidents list
          fetchIncidents();
          toast.success('Incident report created and follow-up tasks generated');
        }}
      />

      {/* Incident Report Viewer */}
      <IncidentReportViewer
        incident={viewingIncident}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewingIncident(null);
        }}
        onDownload={async (incident) => {
          try {
            await downloadIncidentReportPDF(incident);
            toast.success('Report download started');
          } catch (error: any) {
            console.error('Error downloading report:', error);
            toast.error(error.message || 'Failed to download report');
          }
        }}
      />
    </div>
  );
}

