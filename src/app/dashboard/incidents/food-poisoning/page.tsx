'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { FoodPoisoningIncidentModal } from '@/components/incidents/FoodPoisoningIncidentModal';
import { IncidentReportViewer } from '@/components/incidents/IncidentReportViewer';
import { downloadIncidentReportPDF } from '@/lib/incident-report-pdf';
import Select from '@/components/ui/Select';

interface FoodPoisoningIncident {
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

export default function FoodPoisoningPage() {
  const { companyId, siteId } = useAppContext();
  const [incidents, setIncidents] = useState<FoodPoisoningIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<FoodPoisoningIncident | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingIncident, setViewingIncident] = useState<FoodPoisoningIncident | null>(null);

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
      
      // Fetch incidents
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('company_id', companyId)
        .eq('incident_type', 'food_poisoning')
        .order('reported_date', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data: incidentsData, error: incidentsError } = await query;

      if (incidentsError) {
        console.error('Supabase error:', incidentsError);
        throw incidentsError;
      }

      // Fetch sites separately if we have site_ids
      const siteIds = [...new Set((incidentsData || [])
        .map((inc: any) => inc.site_id)
        .filter(Boolean))];

      let sitesMap = new Map<string, { id: string; name: string }>();
      if (siteIds.length > 0) {
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds);
        
        if (sitesData) {
          sitesMap = new Map(sitesData.map(site => [site.id, site]));
        }
      }

      // Transform data to include site name
      const incidentsWithSites = (incidentsData || []).map((incident: any) => {
        const site = incident.site_id ? sitesMap.get(incident.site_id) : null;
        
        return {
          ...incident,
          site_name: site?.name || 'No site assigned',
          severity: incident.severity || 'near_miss',
          status: incident.status || 'open',
          reported_by: incident.reported_by || 'Unknown'
        };
      });

      setIncidents(incidentsWithSites);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to load incidents: ${errorMessage}`);
      setIncidents([]);
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
    switch (severity) {
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
        return 'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border-gray-200 dark:border-gray-500/40';
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
        return 'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border-gray-200 dark:border-gray-500/40';
      default:
        return 'bg-gray-50 dark:bg-theme-surface-elevated0/20 text-theme-secondary border-gray-200 dark:border-gray-500/40';
    }
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 dark:text-orange-400" />
              Food Poisoning Reports
            </h1>
            <p className="text-theme-secondary text-sm sm:text-base">Track and manage food poisoning incidents and customer complaints</p>
          </div>
          <Button
            onClick={() => setIsIncidentModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base px-3 sm:px-4 py-2 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Food Poisoning</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-theme-surface border border-theme rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg bg-theme-surface ] border border-theme text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-module-fg/[0.50] dark:focus:ring-module-fg"
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
            <p className="text-theme-secondary">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">No food poisoning incidents found</h3>
            <p className="text-theme-secondary mb-6">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No food poisoning incidents have been reported yet'}
            </p>
            {!searchTerm && statusFilter === 'all' && severityFilter === 'all' && (
              <Button
                onClick={() => setIsIncidentModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Report First Incident
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-theme-surface border border-theme rounded-lg p-4 sm:p-6 hover:bg-theme-hover transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-theme-primary mb-1 sm:mb-2 truncate">{incident.title}</h3>
                    <p className="text-theme-secondary text-sm mb-2 sm:mb-3 line-clamp-2">{incident.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-theme-secondary/50">
                      <span className="truncate max-w-[150px]">By: {incident.reported_by}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(incident.reported_date || incident.reported_at).toLocaleDateString()}</span>
                      {incident.site_name && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate max-w-[120px]">{incident.site_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                      {incident.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getStatusColor(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-theme">
                  <Button
                    onClick={() => {
                      setViewingIncident(incident);
                      setIsViewerOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-theme-secondary border-gray-300 dark:border-white/20 hover:bg-theme-muted text-xs sm:text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                    View
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
                    className="text-theme-secondary border-gray-300 dark:border-white/20 hover:bg-theme-muted text-xs sm:text-sm"
                  >
                    <Download className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Download</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Food Poisoning Incident Modal */}
      <FoodPoisoningIncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setSelectedIncident(null);
        }}
        onComplete={(incidentId) => {
          // Refresh incidents list
          fetchIncidents();
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

