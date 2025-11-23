'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'near_miss' | 'minor' | 'moderate' | 'major' | 'critical' | 'fatality' | 'low' | 'medium' | 'high';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reported_by: string;
  reported_date: string;
  site_id?: string;
  site_name?: string;
  incident_type?: 'incident' | 'staff_sickness';
}

interface IncidentsWidgetProps {
  limit?: number;
  showLink?: boolean;
  title?: string;
}

export function IncidentsWidget({ limit = 6, showLink = true, title = 'Incidents' }: IncidentsWidgetProps) {
  const { companyId, siteId } = useAppContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    
    fetchIncidents();
    
    // Realtime subscription: reload when incidents change
    const channel = supabase
      .channel("incidents-widget-updates")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "incidents",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("New incident inserted, refreshing widget...");
          fetchIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "incidents",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("Incident updated, refreshing widget...");
          fetchIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "staff_sickness_records",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("New staff sickness record inserted, refreshing widget...");
          fetchIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "staff_sickness_records",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("Staff sickness record updated, refreshing widget...");
          fetchIncidents();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, siteId]);

  async function fetchIncidents() {
    try {
      setLoading(true);
      setError(null);
      
      if (!companyId) {
        setIncidents([]);
        setLoading(false);
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
        .in('status', ['open', 'investigating'])
        .order('reported_date', { ascending: false })
        .limit(limit * 2); // Fetch more to account for filtering

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
        .in('status', ['active'])
        .order('reported_date', { ascending: false })
        .limit(limit * 2);

      if (siteId) {
        sicknessQuery = sicknessQuery.eq('site_id', siteId);
      }

      const { data: sicknessData, error: sicknessError } = await sicknessQuery;

      if (incidentsError) {
        console.error('Error fetching incidents:', incidentsError);
        throw incidentsError;
      }

      if (sicknessError) {
        console.error('Error fetching staff sickness records:', sicknessError);
        // Continue with incidents only
      }

      // Get unique site IDs from all records
      const allRecords = [
        ...(incidentsData || []),
        ...(sicknessData || [])
      ];
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
          sitesMap = sitesData.reduce((acc, site) => {
            acc[site.id] = { id: site.id, name: site.name };
            return acc;
          }, {} as Record<string, { id: string; name: string }>);
        }
      }

      // Combine and transform data
      const combinedRecords: Incident[] = [];

      // Add regular incidents
      (incidentsData || []).forEach((incident: any) => {
        const reportedByName = incident.reported_by_profile?.full_name || incident.reported_by_profile?.email || 'Unknown';
        combinedRecords.push({
          ...incident,
          incident_type: 'incident',
          reported_by: reportedByName,
          reported_date: incident.reported_date || incident.created_at,
          severity: incident.severity || 'minor',
          status: incident.status || 'open',
          site_name: incident.site_id ? (sitesMap[incident.site_id]?.name || '') : '',
        });
      });

      // Add staff sickness records, transformed to Incident format
      (sicknessData || []).forEach((record: any) => {
        const staffMemberName = record.staff_member_profile?.full_name || record.staff_member_name || 'Unknown Staff';
        const reportedByName = record.reported_by_profile?.full_name || record.reported_by_profile?.email || 'Unknown Reporter';

        let severity: Incident['severity'] = 'minor';
        if (record.symptomatic_in_food_areas) severity = 'critical';
        else if (record.medical_clearance_required) severity = 'major';
        else if (record.food_handling_restricted) severity = 'moderate';

        combinedRecords.push({
          id: record.id,
          title: `Staff Sickness: ${staffMemberName}`,
          description: `Symptoms: ${record.symptoms}. Notes: ${record.notes || 'N/A'}. Exclusion Start: ${new Date(record.exclusion_period_start).toLocaleDateString()}`,
          incident_type: 'staff_sickness',
          severity: severity,
          status: 'open', // Staff sickness is always "open" when active
          reported_by: reportedByName,
          reported_date: record.reported_date || record.created_at,
          site_id: record.site_id,
          site_name: record.site_id ? (sitesMap[record.site_id]?.name || '') : '',
        });
      });

      // Sort all combined records by reported_date and limit
      combinedRecords.sort((a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime());
      setIncidents(combinedRecords.slice(0, limit));

    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setError(err.message || 'Failed to load incidents');
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical':
      case 'fatality':
        return 'text-red-400 bg-red-500/20';
      case 'major':
      case 'high':
        return 'text-orange-400 bg-orange-500/20';
      case 'moderate':
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'minor':
      case 'low':
      case 'near_miss':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-white/60 bg-white/10';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'open':
        return 'text-red-400';
      case 'investigating':
        return 'text-yellow-400';
      case 'resolved':
        return 'text-green-400';
      case 'closed':
        return 'text-white/60';
      default:
        return 'text-white/60';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <p className="text-slate-500 text-sm">Loading incidents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <p className="text-red-400 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {showLink && (
          <Link 
            href="/dashboard/incidents"
            className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
          >
            View All
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
      
      {incidents.length === 0 ? (
        <p className="text-slate-500 text-sm">No open incidents.</p>
      ) : (
        <ul className="text-sm text-slate-300 space-y-3">
          {incidents.map((incident) => (
            <li key={incident.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">
                      {incident.title || `Incident #${incident.id.slice(0, 8)}`}
                    </span>
                    {incident.incident_type === 'staff_sickness' && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex-shrink-0">
                        Sickness
                      </span>
                    )}
                  </div>
                  {incident.description && (
                    <p className="text-xs text-white/60 line-clamp-2 mb-1">
                      {incident.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`text-xs ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                    {incident.site_name && (
                      <span className="text-xs text-white/40">
                        {incident.site_name}
                      </span>
                    )}
                    <span className="text-xs text-white/40">
                      {new Date(incident.reported_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    Reported by: {incident.reported_by}
                  </div>
                </div>
                <Link
                  href={`/dashboard/incidents?incident=${incident.id}`}
                  className="text-pink-400 hover:text-pink-300 transition-colors flex-shrink-0"
                  title="View details"
                >
                  <AlertTriangle className="w-4 h-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

