'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye, FileText, UtensilsCrossed, MessageSquare, Activity, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { EmergencyIncidentModal } from '@/components/incidents/EmergencyIncidentModal';
import Select from '@/components/ui/Select';
import Link from 'next/link';

interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: 'near_miss' | 'minor' | 'moderate' | 'major' | 'critical' | 'fatality' | 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reported_by: string;
  reported_date: string;
  reported_at?: string;
  incident_date?: string;
  site_id?: string;
  site_name?: string;
  riddor_reportable?: boolean;
  riddor_reported?: boolean;
  riddor_reference?: string;
}

const incidentTypeLabels: Record<string, { label: string; icon: any }> = {
  food_poisoning: { label: 'Food Poisoning', icon: UtensilsCrossed },
  accident: { label: 'Accident & Injury', icon: Activity },
  customer_complaint: { label: 'Customer Complaint', icon: MessageSquare },
  complaint: { label: 'Customer Complaint', icon: MessageSquare },
  riddor: { label: 'RIDDOR Report', icon: ShieldAlert },
  slip_trip: { label: 'Slip/Trip', icon: AlertTriangle },
  cut: { label: 'Cut', icon: AlertTriangle },
  burn: { label: 'Burn', icon: AlertTriangle },
  fall: { label: 'Fall', icon: AlertTriangle },
  electrical: { label: 'Electrical', icon: AlertTriangle },
  fire: { label: 'Fire', icon: AlertTriangle },
  other: { label: 'Other', icon: AlertTriangle },
};

export default function IncidentsStoragePage() {
  const { companyId, siteId, loading: contextLoading } = useAppContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    // Wait for context to load before fetching
    if (contextLoading) {
      return;
    }
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, siteId, contextLoading]);

  async function fetchIncidents() {
    try {
      setLoading(true);
      
      if (!companyId) {
        console.warn('No company ID available');
        setError('No company ID available. Please ensure you are logged in.');
        setIncidents([]);
        setLoading(false);
        return;
      }
      
      // Fetch all incidents regardless of type
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('company_id', companyId)
        .order('reported_date', { ascending: false })
        .order('incident_date', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
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
        const site = incident.site_id ? sitesMap[incident.site_id] : null;
        
        return {
          ...incident,
          site_name: site?.name || 'No site assigned',
          severity: incident.severity || 'near_miss',
          status: incident.status || 'open',
          reported_by: incident.reported_by || 'Unknown',
          incident_type: incident.incident_type || 'other',
        };
      });

      setIncidents(incidentsWithSites);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching incidents:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error';
      setError(`Failed to load incidents: ${errorMessage}`);
      toast.error(`Failed to load incidents: ${errorMessage}`);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      incident.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.incident_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesType = typeFilter === 'all' || incident.incident_type === typeFilter;

    return matchesSearch && matchesStatus && matchesSeverity && matchesType;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'fatality':
        return 'bg-red-600/20 text-red-300 border-red-600/40';
      case 'major':
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'minor':
      case 'low':
      case 'near_miss':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'investigating':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'resolved':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'closed':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getIncidentTypeInfo = (type: string) => {
    return incidentTypeLabels[type] || { label: type, icon: AlertTriangle };
  };

  // Get unique incident types for filter
  const incidentTypes = [...new Set(incidents.map(i => i.incident_type).filter(Boolean))];

  // Debug logging
  useEffect(() => {
    console.log('[Incident Log Page] Component mounted/updated', {
      companyId: companyId ? 'present' : 'missing',
      siteId: siteId ? 'present' : 'missing',
      contextLoading,
      loading,
      error,
      incidentsCount: incidents.length
    });
  }, [companyId, siteId, contextLoading, loading, error, incidents.length]);

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-pink-400" />
              Incident Log
            </h1>
            <p className="text-white/60">Complete record of all incidents, accidents, complaints, and RIDDOR reports</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/compliance/eho-pack">
              <Button
                variant="outline"
                className="text-white border-white/20 hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to EHO Pack
              </Button>
            </Link>
            <Button
              onClick={() => setIsIncidentModalOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Total Incidents</div>
            <div className="text-2xl font-bold text-white">{incidents.length}</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">Open</div>
            <div className="text-2xl font-bold text-red-400">
              {incidents.filter(i => i.status === 'open').length}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">RIDDOR Reportable</div>
            <div className="text-2xl font-bold text-orange-400">
              {incidents.filter(i => i.riddor_reportable).length}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4">
            <div className="text-white/60 text-sm mb-1">RIDDOR Reported</div>
            <div className="text-2xl font-bold text-green-400">
              {incidents.filter(i => i.riddor_reported).length}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value)}
              placeholder="All Types"
              options={[
                { label: 'All Types', value: 'all' },
                ...incidentTypes.map(type => ({
                  label: getIncidentTypeInfo(type).label,
                  value: type,
                })),
              ]}
              className="w-full md:w-[180px]"
            />

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
              ]}
              className="w-full md:w-[180px]"
            />
          </div>
        </div>

        {/* Incidents List */}
        {contextLoading || loading ? (
          <div className="text-center py-12">
            <p className="text-white/60">Loading incidents...</p>
          </div>
        ) : error ? (
          <div className="bg-white/[0.03] border border-red-500/20 rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Error Loading Incidents</h3>
            <p className="text-white/60 mb-6">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                fetchIncidents();
              }}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              Try Again
            </Button>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-12 text-center">
            <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {incidents.length === 0 ? 'No incidents reported' : 'No incidents match your filters'}
            </h3>
            <p className="text-white/60 mb-6">
              {incidents.length === 0
                ? 'No incidents, accidents, complaints, or RIDDOR reports have been recorded yet. This will be reflected in your EHO readiness score.'
                : 'Try adjusting your search or filter criteria'}
            </p>
            {incidents.length === 0 && (
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
          <div className="space-y-4">
            {filteredIncidents.map((incident) => {
              const typeInfo = getIncidentTypeInfo(incident.incident_type);
              const Icon = typeInfo.icon;
              
              return (
                <div
                  key={incident.id}
                  className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-6 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-pink-400" />
                        <h3 className="text-lg font-semibold text-white">{incident.title || 'Untitled Incident'}</h3>
                        {incident.riddor_reportable && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/40">
                            RIDDOR
                          </span>
                        )}
                        {incident.riddor_reported && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/40">
                            RIDDOR REPORTED
                          </span>
                        )}
                      </div>
                      <p className="text-white/70 text-sm mb-3">{incident.description}</p>
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span>Type: {typeInfo.label}</span>
                        <span>•</span>
                        <span>Reported: {new Date(incident.reported_date || incident.reported_at || incident.incident_date).toLocaleDateString()}</span>
                        {incident.site_name && (
                          <>
                            <span>•</span>
                            <span>{incident.site_name}</span>
                          </>
                        )}
                        {incident.riddor_reference && (
                          <>
                            <span>•</span>
                            <span>RIDDOR Ref: {incident.riddor_reference}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-md text-xs font-medium border ${getStatusColor(incident.status)}`}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    <Button
                      onClick={() => {
                        setSelectedIncident(incident);
                        toast.info('View incident report feature coming soon');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </Button>
                    <Button
                      onClick={() => {
                        toast.info('Download report feature coming soon');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
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
          fetchIncidents();
          toast.success('Incident report created');
        }}
      />
    </div>
  );
}

