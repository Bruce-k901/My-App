'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Bug, Calendar, Package, AlertTriangle, FileText, Shield, ArrowRight, Check, Clock } from '@/components/ui/icons';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PestControlOverviewPage() {
  const { companyId, siteId } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [stats, setStats] = useState({
    ytdSpend: 0,
    visitCount: 0,
    openSightings: 0,
    totalDevices: 0,
    lastVisitDate: null as string | null,
    nextVisitDue: null as string | null,
  });
  const [sightingTrend, setSightingTrend] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    if (companyId) fetchAll();
  }, [companyId, siteId]);

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.allSettled([
        fetchContract(),
        fetchVisitStats(),
        fetchSightingStats(),
        fetchDeviceCount(),
        fetchSightingTrend(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContract() {
    try {
      let query = supabase
        .from('pest_control_contracts')
        .select('*, contractor:contractors(name)')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .limit(1);

      if (siteId && siteId !== 'all') {
        query = query.or(`site_id.eq.${siteId},site_id.is.null`);
      }

      const { data } = await query;
      setContract(data?.[0] || null);
    } catch {
      setContract(null);
    }
  }

  async function fetchVisitStats() {
    try {
      const year = new Date().getFullYear();
      let query = supabase
        .from('pest_control_visits')
        .select('visit_date, total_cost')
        .eq('company_id', companyId)
        .gte('visit_date', `${year}-01-01`)
        .order('visit_date', { ascending: false });

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setStats(prev => ({
          ...prev,
          ytdSpend: data.reduce((sum, v) => sum + (v.total_cost || 0), 0),
          visitCount: data.length,
          lastVisitDate: data[0].visit_date,
        }));
      }
    } catch {}
  }

  async function fetchSightingStats() {
    try {
      let query = supabase
        .from('pest_sightings')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('resolved', false);

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { count } = await query;
      setStats(prev => ({ ...prev, openSightings: count || 0 }));
    } catch {}
  }

  async function fetchDeviceCount() {
    try {
      let query = supabase
        .from('pest_control_devices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { count } = await query;
      setStats(prev => ({ ...prev, totalDevices: count || 0 }));
    } catch {}
  }

  async function fetchSightingTrend() {
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      let query = supabase
        .from('pest_sightings')
        .select('sighting_date')
        .eq('company_id', companyId)
        .gte('sighting_date', start.toISOString().split('T')[0]);

      if (siteId && siteId !== 'all') {
        query = query.eq('site_id', siteId);
      }

      const { data } = await query;
      if (data) {
        const months: Record<string, number> = {};
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
          const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          months[key] = 0;
        }
        data.forEach(s => {
          const d = new Date(s.sighting_date);
          const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          if (key in months) months[key]++;
        });
        setSightingTrend(Object.entries(months).map(([month, count]) => ({ month, count })));
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <p className="text-theme-secondary text-center py-12">Loading pest control overview...</p>
      </div>
    );
  }

  const contractExpiring = contract?.contract_end_date
    ? Math.ceil((new Date(contract.contract_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 60
    : false;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-theme-primary">Pest Control</h1>
        <p className="text-sm text-theme-secondary mt-0.5">
          {contract ? `Provider: ${contract.contractor?.name || 'Unknown'}` : 'No active contract'}
        </p>
      </div>

      {/* No contract CTA */}
      {!contract && (
        <div
          onClick={() => router.push('/dashboard/pest-control/contract')}
          className="flex items-center gap-4 p-5 rounded-xl border-2 border-dashed border-checkly-dark/30 dark:border-checkly/30 bg-checkly-dark/5 dark:bg-checkly/5 cursor-pointer hover:border-checkly-dark dark:hover:border-checkly transition-colors"
        >
          <Shield className="w-10 h-10 text-checkly-dark dark:text-checkly flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-theme-primary">Set up your pest control contract</p>
            <p className="text-sm text-theme-secondary mt-0.5">
              Add your pest control provider, contract details, and certifications for SALSA compliance.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-checkly-dark dark:text-checkly flex-shrink-0" />
        </div>
      )}

      {/* Contract expiring alert */}
      {contract && contractExpiring && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your pest control contract expires on <strong>{contract.contract_end_date}</strong>.
          </p>
          <button onClick={() => router.push('/dashboard/pest-control/contract')} className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400 underline">
            Review
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Contract"
          value={contract ? (contractExpiring ? 'Expiring' : 'Active') : 'None'}
          color={contract ? (contractExpiring ? 'amber' : 'emerald') : 'red'}
          icon={<Shield className="w-5 h-5" />}
          onClick={() => router.push('/dashboard/pest-control/contract')}
        />
        <KpiCard
          label="YTD Spend"
          value={`£${stats.ytdSpend.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${stats.visitCount} visit${stats.visitCount !== 1 ? 's' : ''}`}
          icon={<Calendar className="w-5 h-5" />}
          onClick={() => router.push('/dashboard/pest-control/visits')}
        />
        <KpiCard
          label="Active Devices"
          value={`${stats.totalDevices}`}
          icon={<Package className="w-5 h-5" />}
          onClick={() => router.push('/dashboard/pest-control/devices')}
        />
        <KpiCard
          label="Open Sightings"
          value={`${stats.openSightings}`}
          color={stats.openSightings > 0 ? 'red' : 'emerald'}
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => router.push('/dashboard/pest-control/sightings')}
        />
      </div>

      {/* Sightings Trend Chart */}
      {sightingTrend.length > 0 && (
        <div className="bg-theme-surface rounded-xl border border-theme p-5">
          <h3 className="font-semibold text-theme-primary mb-3">Sightings Trend (12 Months)</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sightingTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--text-tertiary, #888)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--text-tertiary, #888)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--surface, 28 25 22))',
                    border: '1px solid rgb(var(--border, 50 47 44))',
                    borderRadius: '8px',
                    color: 'rgb(var(--text-primary, 255 255 255))',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} name="Sightings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickAction
          label="Log Visit"
          description="Record a contractor visit"
          icon={<Calendar className="w-6 h-6" />}
          onClick={() => router.push('/dashboard/pest-control/visits')}
        />
        <QuickAction
          label="Report Sighting"
          description="Log a pest sighting"
          icon={<Bug className="w-6 h-6" />}
          onClick={() => router.push('/dashboard/pest-control/sightings')}
        />
        <QuickAction
          label="View Devices"
          description="Manage device register"
          icon={<Package className="w-6 h-6" />}
          onClick={() => router.push('/dashboard/pest-control/devices')}
        />
      </div>

      {/* Last Visit Info */}
      {stats.lastVisitDate && (
        <div className="bg-theme-surface rounded-xl border border-theme p-4">
          <div className="flex items-center gap-2 text-xs text-theme-tertiary">
            <Clock className="w-3.5 h-3.5" />
            Last contractor visit: <span className="text-theme-primary font-medium">{stats.lastVisitDate}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string; sub?: string; color?: string; icon: React.ReactNode; onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };
  return (
    <div
      onClick={onClick}
      className="bg-theme-surface rounded-xl border border-theme p-4 cursor-pointer hover:border-checkly-dark/30 dark:hover:border-checkly/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-theme-tertiary">{label}</p>
        <span className="text-theme-tertiary">{icon}</span>
      </div>
      <p className={`text-lg font-semibold ${color ? colorClasses[color] : 'text-theme-primary'}`}>{value}</p>
      {sub && <p className="text-xs text-theme-tertiary mt-0.5">{sub}</p>}
    </div>
  );
}

function QuickAction({ label, description, icon, onClick }: {
  label: string; description: string; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border border-theme bg-theme-surface hover:border-checkly-dark/30 dark:hover:border-checkly/30 transition-colors text-left"
    >
      <span className="text-checkly-dark dark:text-checkly">{icon}</span>
      <div>
        <p className="text-sm font-medium text-theme-primary">{label}</p>
        <p className="text-xs text-theme-tertiary">{description}</p>
      </div>
    </button>
  );
}
