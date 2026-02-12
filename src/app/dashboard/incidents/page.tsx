'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Plus, Filter, Search, Download, Eye, ShieldAlert, Utensils, MessageSquareWarning, UserX } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { EmergencyIncidentModal } from '@/components/incidents/EmergencyIncidentModal';
import { FoodPoisoningIncidentModal } from '@/components/incidents/FoodPoisoningIncidentModal';
import { CustomerComplaintModal } from '@/components/incidents/CustomerComplaintModal';
import { IncidentReportViewer } from '@/components/incidents/IncidentReportViewer';
import { downloadIncidentReportPDF } from '@/lib/incident-report-pdf';
import Select from '@/components/ui/Select';

type IncidentType = 'accident' | 'food_poisoning' | 'customer_complaint' | 'staff_sickness';

const INCIDENT_TABS: { id: IncidentType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { id: 'accident', label: 'Accidents', icon: ShieldAlert, description: 'Workplace accidents & emergencies', color: 'text-red-500' },
  { id: 'food_poisoning', label: 'Food Poisoning', icon: Utensils, description: 'Food poisoning investigations', color: 'text-orange-500' },
  { id: 'customer_complaint', label: 'Complaints', icon: MessageSquareWarning, description: 'Customer complaints & feedback', color: 'text-yellow-500' },
  { id: 'staff_sickness', label: 'Staff Sickness', icon: UserX, description: 'Staff illness & exclusion records', color: 'text-purple-500' },
];

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
  return (
    <Suspense fallback={<div className="w-full bg-theme-surface-elevated min-h-screen p-6"><p className="text-theme-secondary">Loading...</p></div>}>
      <IncidentsPageContent />
    </Suspense>
  );
}

function IncidentsPageContent() {
  const { companyId, siteId } = useAppContext();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<IncidentType>('accident');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);
  const [isFoodPoisoningModalOpen, setIsFoodPoisoningModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, [companyId, siteId, activeTab]);

  // Handle ?openIncident=<id> deep-link from dashboard widgets
  useEffect(() => {
    const openIncidentId = searchParams.get('openIncident');
    if (openIncidentId && !deepLinkHandled && !loading) {
      setDeepLinkHandled(true);
      const found = incidents.find(i => i.id === openIncidentId);
      if (found) {
        setViewingIncident(found);
        setIsViewerOpen(true);
      } else {
        // Incident not in current filtered list; fetch it directly
        fetchAndOpenIncident(openIncidentId);
      }
    }
  }, [searchParams, incidents, loading, deepLinkHandled]);

  async function fetchAndOpenIncident(id: string) {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        setViewingIncident(data);
        setIsViewerOpen(true);
      }
    } catch (err) {
      console.error('Error fetching incident:', err);
      toast.error('Could not find the requested incident');
    }
  }

  async function fetchIncidents() {
    // Staff sickness uses a different table, so skip fetching for that tab
    if (activeTab === 'staff_sickness') {
      setIncidents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      if (!companyId) {
        console.warn('No company ID available');
        setIncidents([]);
        return;
      }

      // Map tab to incident types in database
      const incidentTypeMap: Record<string, string[]> = {
        accident: ['emergency', 'accident', 'injury', 'near_miss', 'slip_trip', 'cut', 'burn', 'fall', 'fall_from_height', 'electrical', 'fire', 'chemical', 'other'],
        food_poisoning: ['food_poisoning'],
        customer_complaint: ['customer_complaint', 'complaint'],
      };

      const incidentTypes = incidentTypeMap[activeTab] || [];

      // Fetch incidents - try with sites relationship first
      // If relationship query fails, we'll fetch sites separately
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('company_id', companyId)
        .order('reported_date', { ascending: false });

      // Filter by incident type if not showing all
      if (incidentTypes.length > 0) {
        query = query.in('incident_type', incidentTypes);
      }

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
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

  const handleReportIncident = () => {
    switch (activeTab) {
      case 'accident':
        setIsAccidentModalOpen(true);
        break;
      case 'food_poisoning':
        setIsFoodPoisoningModalOpen(true);
        break;
      case 'customer_complaint':
        setIsComplaintModalOpen(true);
        break;
      case 'staff_sickness':
        // Navigate to staff sickness page
        window.location.href = '/dashboard/incidents/staff-sickness';
        break;
    }
  };

  const getActiveTabInfo = () => INCIDENT_TABS.find(tab => tab.id === activeTab) || INCIDENT_TABS[0];
  const activeTabInfo = getActiveTabInfo();

  return (
    <div className="w-full bg-theme-surface-elevated min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary mb-2 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-module-fg" />
              Incident Reports
            </h1>
            <p className="text-theme-secondary">Track and manage safety incidents and accidents</p>
          </div>
          <Button
            onClick={handleReportIncident}
            className="bg-module-fg hover:bg-module-fg/90 text-white dark:bg-red-600 dark:hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'staff_sickness' ? 'Log Sickness' : 'Report Incident'}
          </Button>
        </div>

        {/* Incident Type Tabs */}
        <div className="bg-theme-surface border border-theme rounded-lg p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {INCIDENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-module-fg/10 dark:bg-module-fg/25 text-module-fg dark:text-module-fg border border-module-fg/[0.30] dark:border-module-fg/[0.30]'
                      : 'text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-theme-primary'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-theme-tertiary mt-2 px-2">
            {activeTabInfo.description}
          </p>
        </div>

        {/* Filters and Search - Hide for staff sickness tab */}
        {activeTab !== 'staff_sickness' && (
          <div className="bg-theme-surface border border-theme rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
                <input
                  type="text"
                  placeholder={`Search ${activeTabInfo.label.toLowerCase()}...`}
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
        )}

        {/* Staff Sickness Tab - Redirect to dedicated page */}
        {activeTab === 'staff_sickness' ? (
          <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
            <UserX className="w-16 h-16 text-purple-400 dark:text-purple-400/60 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-theme-primary mb-2">Staff Sickness & Exclusion Log</h3>
            <p className="text-theme-secondary mb-6">
              Track staff illness, exclusion periods, and return-to-work clearance in the dedicated sickness log.
            </p>
            <Button
              onClick={() => window.location.href = '/dashboard/incidents/staff-sickness'}
              className="bg-module-fg hover:bg-module-fg/90 text-white dark:bg-purple-600 dark:hover:bg-purple-700"
            >
              <UserX className="w-4 h-4 mr-2" />
              Open Sickness Log
            </Button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-theme-secondary">Loading {activeTabInfo.label.toLowerCase()}...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
            {(() => {
              const Icon = activeTabInfo.icon;
              return <Icon className={`w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4`} />;
            })()}
            <h3 className="text-xl font-semibold text-theme-primary mb-2">No {activeTabInfo.label.toLowerCase()} found</h3>
            <p className="text-theme-secondary mb-6">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters'
                : `No ${activeTabInfo.label.toLowerCase()} have been reported yet`}
            </p>
            {!searchTerm && statusFilter === 'all' && severityFilter === 'all' && (
              <Button
                onClick={handleReportIncident}
                className="bg-module-fg hover:bg-module-fg/90 text-white dark:bg-red-600 dark:hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Report First {activeTab === 'customer_complaint' ? 'Complaint' : 'Incident'}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-theme-surface border border-theme rounded-lg p-6 hover:bg-theme-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-theme-primary mb-2">{incident.title}</h3>
                    <p className="text-theme-secondary text-sm mb-3">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-theme-tertiary">
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
                <div className="flex items-center gap-2 pt-4 border-t border-theme">
                  <Button
                    onClick={() => {
                      setViewingIncident(incident);
                      setIsViewerOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="text-theme-secondary border-gray-300 dark:border-white/20 hover:bg-theme-muted"
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
                    className="text-theme-secondary border-gray-300 dark:border-white/20 hover:bg-theme-muted"
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

      {/* Accident/Emergency Incident Modal */}
      <EmergencyIncidentModal
        isOpen={isAccidentModalOpen}
        onClose={() => {
          setIsAccidentModalOpen(false);
          setSelectedIncident(null);
        }}
        onComplete={(incidentId) => {
          fetchIncidents();
          toast.success('Accident report created and follow-up tasks generated');
        }}
      />

      {/* Food Poisoning Incident Modal */}
      <FoodPoisoningIncidentModal
        isOpen={isFoodPoisoningModalOpen}
        onClose={() => {
          setIsFoodPoisoningModalOpen(false);
          setSelectedIncident(null);
        }}
        onComplete={(incidentId) => {
          fetchIncidents();
          toast.success('Food poisoning report created');
        }}
      />

      {/* Customer Complaint Modal */}
      <CustomerComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => {
          setIsComplaintModalOpen(false);
          setSelectedIncident(null);
        }}
        onComplete={(incidentId) => {
          fetchIncidents();
          toast.success('Customer complaint logged and follow-up tasks generated');
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
        onUpdate={() => {
          fetchIncidents();
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

