'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Search, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { CustomerComplaintModal } from '@/components/incidents/CustomerComplaintModal';
import Select from '@/components/ui/Select';

interface CustomerComplaint {
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

export default function CustomerComplaintsPage() {
  const { companyId, siteId } = useAppContext();
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<CustomerComplaint | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, [companyId, siteId]);

  async function fetchComplaints() {
    try {
      setLoading(true);
      
      if (!companyId) {
        console.warn('No company ID available');
        setComplaints([]);
        return;
      }
      
      // Fetch complaints - try both 'customer_complaint' and 'complaint' types
      // Fetch sites separately to avoid relationship query issues
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('company_id', companyId)
        .in('incident_type', ['customer_complaint', 'complaint'])
        .order('reported_date', { ascending: false });

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data: complaintsData, error: complaintsError } = await query;

      if (complaintsError) {
        console.error('Supabase error:', complaintsError);
        // If the query fails, try without the type filter
        const fallbackQuery = supabase
          .from('incidents')
          .select('*')
          .eq('company_id', companyId)
          .order('reported_date', { ascending: false });
        
        if (siteId) {
          fallbackQuery.eq('site_id', siteId);
        }
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          setComplaints([]);
          return;
        }
        
        // Filter manually for complaints
        const filtered = (fallbackData || []).filter((inc: any) => 
          inc.incident_type === 'customer_complaint' || 
          inc.incident_type === 'complaint' ||
          (inc.title && inc.title.toLowerCase().includes('complaint'))
        );
        
        // Fetch sites separately
        const siteIds = [...new Set(filtered.map((inc: any) => inc.site_id).filter(Boolean))];
        let sitesMap = new Map<string, { id: string; name: string }>();
        
        if (siteIds.length > 0) {
          const { data: sitesData } = await supabase
            .from('sites')
            .select('id, name')
            .in('id', siteIds)
            .eq('company_id', companyId);
          
          if (sitesData) {
            sitesMap = new Map(sitesData.map(site => [site.id, site]));
          }
        }
        
        // Transform data
        const complaintsWithSites = filtered.map((complaint: any) => {
          const site = complaint.site_id ? sitesMap.get(complaint.site_id) : null;
          
          return {
            ...complaint,
            site_name: site?.name || 'No site assigned',
            severity: complaint.severity || 'low',
            status: complaint.status || 'open',
            reported_by: complaint.reported_by || 'Unknown'
          };
        });
        
        setComplaints(complaintsWithSites);
        return;
      }

      // Get unique site IDs from complaints
      const siteIds = [...new Set((complaintsData || []).map((inc: any) => inc.site_id).filter(Boolean))];
      
      // Fetch sites separately if we have site IDs
      let sitesMap = new Map<string, { id: string; name: string }>();
      if (siteIds.length > 0) {
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('id, name')
          .in('id', siteIds)
          .eq('company_id', companyId);
        
        if (!sitesError && sitesData) {
          sitesMap = new Map(sitesData.map(site => [site.id, site]));
        }
      }
      
      // Transform data to include site name
      const complaintsWithSites = (complaintsData || []).map((complaint: any) => {
        const site = complaint.site_id ? sitesMap.get(complaint.site_id) : null;
        
        return {
          ...complaint,
          site_name: site?.name || 'No site assigned',
          severity: complaint.severity || 'low',
          status: complaint.status || 'open',
          reported_by: complaint.reported_by || 'Unknown'
        };
      });

      setComplaints(complaintsWithSites);
    } catch (error: any) {
      console.error('Error fetching complaints:', error);
      const errorMessage = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to load complaints: ${errorMessage}`);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || complaint.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
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

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
              Customer Complaints
            </h1>
            <p className="text-white/60 text-sm sm:text-base">Track and manage customer complaints and feedback</p>
          </div>
          <Button
            onClick={() => setIsIncidentModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] bg-red-600 active:bg-red-700 text-white text-base touch-manipulation"
          >
            <Plus className="w-5 h-5 mr-2" />
            Log Complaint
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="search"
                inputMode="search"
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Search complaints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500 text-base"
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

        {/* Complaints List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-white/60">Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No customer complaints found</h3>
            <p className="text-white/60 mb-6">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No customer complaints have been logged yet'}
            </p>
            {!searchTerm && statusFilter === 'all' && severityFilter === 'all' && (
              <Button
                onClick={() => setIsIncidentModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log First Complaint
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((complaint) => (
              <div
                key={complaint.id}
                className="bg-white/[0.03] border border-white/[0.1] rounded-lg p-6 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{complaint.title}</h3>
                    <p className="text-white/70 text-sm mb-3">{complaint.description}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-white/50">
                      <span>Reported by: {complaint.reported_by}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(complaint.reported_date || complaint.reported_at).toLocaleDateString()}</span>
                      {complaint.site_name && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>{complaint.site_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:ml-4">
                    <span className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border ${getSeverityColor(complaint.severity)}`}>
                      {complaint.severity.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium border ${getStatusColor(complaint.status)}`}>
                      {complaint.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => {
                      setSelectedComplaint(complaint);
                      toast.info('View complaint report feature coming soon');
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-h-[44px] touch-manipulation"
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
                    className="flex-1 min-h-[44px] touch-manipulation"
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

      {/* Customer Complaint Modal */}
      <CustomerComplaintModal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setSelectedComplaint(null);
        }}
        onComplete={(incidentId) => {
          // Refresh complaints list
          fetchComplaints();
          toast.success('Customer complaint logged and follow-up tasks generated');
        }}
      />
    </div>
  );
}

