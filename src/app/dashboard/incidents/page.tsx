'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { EmergencyIncidentModal } from '@/components/incidents/EmergencyIncidentModal';
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
  incident_type?: 'incident' | 'staff_sickness'; // Add type to distinguish
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
      
      // Fetch incidents with profile relationship for reported_by
      let incidentsQuery = supabase
        .from('incidents')
        .select(`
          *,
          reported_by_profile:profiles!reported_by(full_name, email)
        `)
        .eq('company_id', companyId)
        .order('reported_date', { ascending: false });

      if (siteId) {
        incidentsQuery = incidentsQuery.eq('site_id', siteId);
      }

      const { data: incidentsData, error: incidentsError } = await incidentsQuery;

      // Fetch staff sickness records
      let sicknessQuery = supabase
        .from('staff_sickness_records')
        .select(`
          *,
          reported_by_profile:profiles!reported_by(full_name, email),
          staff_member_profile:profiles!staff_member_id(full_name, email)
        `)
        .eq('company_id', companyId)
        .order('reported_date', { ascending: false });

      if (siteId) {
        sicknessQuery = sicknessQuery.eq('site_id', siteId);
      }

      const { data: sicknessData, error: sicknessError } = await sicknessQuery;

      // Handle errors
      if (incidentsError) {
        console.error('Error fetching incidents:', incidentsError);
        throw incidentsError;
      }

      if (sicknessError) {
        console.error('Error fetching staff sickness records:', sicknessError);
        // Don't throw - continue with incidents only
      }

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

      // Combine incidents and staff sickness records
      const allRecords = [
        ...(incidentsData || []).map((inc: any) => ({ ...inc, record_type: 'incident' })),
        ...(sicknessData || []).map((sick: any) => ({ ...sick, record_type: 'staff_sickness' }))
      ];

      // Get unique site IDs from all records
      const siteIds = [...new Set(allRecords.map((record: any) => record.site_id).filter(Boolean))];
      
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
      
      // Transform data to include site name and normalize format
      const transformedRecords = allRecords.map((record: any) => {
        // Get site name from the map
        const site = record.site_id ? sitesMap[record.site_id] : null;
        
        if (record.record_type === 'staff_sickness') {
          // Transform staff sickness record to incident format
          const reportedByName = record.reported_by_profile?.full_name || 
                                record.reported_by_profile?.email || 
                                'Unknown';
          
          const staffMemberName = record.staff_member_profile?.full_name || 
                                 record.staff_member_name || 
                                 'Unknown Staff Member';
          
          // Determine severity based on symptoms and status
          let severity: string = 'minor';
          if (record.symptomatic_in_food_areas) {
            severity = 'critical';
          } else if (record.medical_clearance_required) {
            severity = 'major';
          } else if (record.food_handling_restricted) {
            severity = 'moderate';
          }
          
          // Map status
          let status: string = 'open';
          if (record.status === 'cleared') {
            status = 'resolved';
          } else if (record.status === 'closed') {
            status = 'closed';
          } else if (record.medical_clearance_received) {
            status = 'investigating';
          }
          
          return {
            id: record.id,
            title: `Staff Sickness: ${staffMemberName}`,
            description: `Symptoms: ${record.symptoms}${record.notes ? ` | Notes: ${record.notes}` : ''}`,
            severity: severity as any,
            status: status as any,
            reported_by: reportedByName,
            reported_date: record.reported_date || record.created_at,
            site_id: record.site_id,
            site_name: site?.name || 'No site assigned',
            incident_type: 'staff_sickness' as const,
            // Include original data for reference
            original_data: record
          };
        } else {
          // Regular incident - transform as before
          const reportedByName = record.reported_by_profile?.full_name || 
                                record.reported_by_profile?.email || 
                                'Unknown';
          
          return {
            ...record,
            site_name: site?.name || 'No site assigned',
            severity: record.severity || 'near_miss',
            status: record.status || 'open',
            reported_by: reportedByName,
            incident_type: 'incident' as const
          };
        }
      });

      // Sort by reported_date (most recent first)
      transformedRecords.sort((a, b) => {
        const dateA = new Date(a.reported_date || a.reported_at || 0).getTime();
        const dateB = new Date(b.reported_date || b.reported_at || 0).getTime();
        return dateB - dateA;
      });

      setIncidents(transformedRecords);
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
    switch (severity) {
      case 'critical':
        return 'bg-red-600/20 text-red-300 border-red-600/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'low':
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

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-pink-400" />
              Incident Reports
            </h1>
            <p className="text-white/60">Track and manage safety incidents and accidents</p>
          </div>
          <Button
            onClick={() => setIsIncidentModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
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
            <p className="text-white/60">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No incidents found</h3>
            <p className="text-white/60 mb-6">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No incidents have been reported yet'}
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
          <div className="space-y-4">
            {filteredIncidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-6 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                      {incident.incident_type === 'staff_sickness' && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          STAFF SICKNESS
                        </span>
                      )}
                    </div>
                    <p className="text-white/70 text-sm mb-3">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-white/50">
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
    </div>
  );
}

