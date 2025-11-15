import useSWR from "swr";
import { useMemo } from "react";
import { format } from "date-fns";

interface ComplianceSummaryResponse {
  tenant_id: string;
  range: {
    from: string;
    to: string;
    days: number;
  };
  tenant: {
    overview: {
      average_score: number | null;
      highest_score: number | null;
      lowest_score: number | null;
      latest_score_date: string | null;
      open_critical_incidents_today: number | null;
      overdue_corrective_actions_today: number | null;
      site_count: number | null;
    } | null;
    sites: Array<{
      score: number | null;
      site_id: string | null;
      site_name: string | null;
      score_date: string | null;
      breakdown: any;
    }> | null;
  };
  site: {
    site_id: string;
    latest: {
      score: number | null;
      score_date: string | null;
      breakdown: any;
    } | null;
    history: Array<{
      score_date: string;
      score: number;
      open_critical_incidents: number;
      overdue_corrective_actions: number;
      missed_daily_checklists: number;
      temperature_breaches_last_7d: number;
      breakdown: any;
    }>;
  } | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  
  // If there's an error in the response but status is 200, return empty data structure
  if (data.error && res.ok) {
    console.warn("Compliance summary API returned error but 200 status:", data.error);
    return {
      tenant_id: data.tenant_id ?? null,
      range: data.range ?? {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        to: new Date().toISOString().split("T")[0],
        days: 30,
      },
      tenant: {
        overview: null,
        sites: [],
      },
      site: null,
    };
  }
  
  if (!res.ok) {
    throw new Error(`Failed to fetch compliance summary: ${res.status}`);
  }
  
  return data;
};

function formatNumber(number: number | null | undefined, fallback = "-") {
  if (number === null || number === undefined || Number.isNaN(number)) return fallback;
  return number.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatPercent(number: number | null | undefined) {
  if (number === null || number === undefined || Number.isNaN(number)) return "-";
  const clamped = Math.max(0, Math.min(100, number));
  return `${clamped.toFixed(1)}%`;
}

const STATUS_LABELS: Record<string, string> = {
  open_critical_incidents: "Critical incidents",
  overdue_corrective_actions: "Overdue corrective actions",
  missed_daily_checklists: "Missed daily checklists",
  temperature_breaches_last_7d: "Temperature breaches (7d)",
};

type Props = {
  tenantId: string;
  siteId?: string | null;
};

export function MetricsGrid({ tenantId, siteId }: Props) {
  const params = new URLSearchParams({ tenant_id: tenantId });
  if (siteId) params.set("site_id", siteId);

  const { data, error, isLoading } = useSWR<ComplianceSummaryResponse>(
    `/api/compliance/summary?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 }
  );

  const tenantOverview = data?.tenant.overview;
  const latestSite = siteId ? data?.site?.latest : null;
  const siteHistory = data?.site?.history ?? [];
  const tenantSites = data?.tenant.sites ?? [];

  const breakdown = useMemo(() => {
    if (!latestSite?.breakdown) return null;
    return latestSite.breakdown as Record<string, unknown>;
  }, [latestSite?.breakdown]);

  const latestScoreDate = latestSite?.score_date
    ? format(new Date(latestSite.score_date), "dd MMM yyyy")
    : tenantOverview?.latest_score_date
      ? format(new Date(tenantOverview.latest_score_date), "dd MMM yyyy")
      : null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 md:p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-white">Compliance score</h3>
            <p className="text-xs text-slate-400">
              {siteId ? "Latest reading for this site" : "Estate-wide average score"}
            </p>
          </div>
          <div className="text-right">
            {latestScoreDate && <p className="text-xs text-slate-400">As of {latestScoreDate}</p>}
            <p className="text-xs text-slate-500">Range: last {data?.range.days ?? 30} days</p>
          </div>
        </div>
        {isLoading ? (
          <div className="text-sm text-slate-400">Loading compliance data…</div>
        ) : error ? (
          <div className="text-sm text-red-400">
            Failed to load compliance summary: {error.message}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xl text-slate-400">Score</div>
              <div className="text-5xl font-semibold text-white">
                {siteId
                  ? formatPercent(latestSite?.score ?? null)
                  : formatPercent(tenantOverview?.average_score ?? null)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {siteId
                  ? "Weighted score for this site."
                  : "Average across estate. Click into a site for detail."}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">Score history</div>
              <div className="flex items-end gap-1 h-16">
                {siteHistory.length ? (
                  siteHistory.slice(-14).map((entry) => (
                    <div
                      key={entry.score_date}
                      className="flex-1 bg-white/10 rounded"
                      style={{ height: `${Math.max(0, Math.min(100, entry.score))}%` }}
                      title={`${entry.score.toFixed(1)} on ${entry.score_date}`}
                    />
                  ))
                ) : (
                  <div className="text-sm text-slate-500">
                    {siteId
                      ? "No history for this site yet."
                      : "Switch to a site to view history."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="rounded border border-white/10 p-3">
            <p className="text-xs text-slate-500 mb-1">Highest score</p>
            <p className="text-lg font-semibold">
              {formatPercent(tenantOverview?.highest_score ?? null)}
            </p>
          </div>
          <div className="rounded border border-white/10 p-3">
            <p className="text-xs text-slate-500 mb-1">Lowest score</p>
            <p className="text-lg font-semibold">
              {formatPercent(tenantOverview?.lowest_score ?? null)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 md:p-5">
        <h3 className="text-2xl font-semibold text-white mb-3">
          {siteId ? "Today's risk drivers" : "Estate-wide open actions"}
        </h3>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-center justify-between">
            <span>Critical incidents</span>
            <span className="text-slate-100 font-semibold">
              {formatNumber(siteId ? latestSite?.breakdown?.open_critical_incidents ?? null : tenantOverview?.open_critical_incidents_today)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Overdue corrective actions</span>
            <span className="text-slate-100 font-semibold">
              {formatNumber(siteId ? latestSite?.breakdown?.overdue_corrective_actions ?? null : tenantOverview?.overdue_corrective_actions_today)}
            </span>
          </li>
          {siteId && (
            <>
              <li className="flex items-center justify-between">
                <span>Missed daily checklists</span>
                <span className="text-slate-100 font-semibold">
                  {formatNumber(latestSite?.breakdown?.missed_daily_checklists ?? null)}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Temperature breaches (7 days)</span>
                <span className="text-slate-100 font-semibold">
                  {formatNumber(latestSite?.breakdown?.temperature_breaches_last_7d ?? null)}
                </span>
              </li>
            </>
          )}
          {!siteId && (
            <li className="text-xs text-slate-500">
              Switch to a site to see individual checklist & temperature breach breakdowns.
            </li>
          )}
        </ul>
      </div>

      <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 md:p-5 lg:col-span-2">
        <h3 className="text-2xl font-semibold text-white mb-3">Sites ranked by latest score</h3>
        {tenantSites.length === 0 ? (
          <p className="text-sm text-slate-400">No score data available yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {tenantSites
              .filter((site) => site?.site_id)
              .map((site) => (
                <div key={site.site_id} className="rounded border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-300 font-medium">
                      {site.site_name || site.site_id || 'Unknown Site'}
                    </div>
                    <div className="text-slate-100 font-semibold">
                      {formatPercent(site.score ?? null)}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <div key={key}>
                        <div className="uppercase tracking-wide text-[10px] text-slate-500">{label}</div>
                        <div className="text-slate-300">
                          {formatNumber((site.breakdown as any)?.[key] ?? null, "0")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {siteHistory.length > 0 && (
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-4 md:p-5 lg:col-span-2">
          <h3 className="text-2xl font-semibold text-white mb-3">Site score history</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Score</th>
                  <th className="p-2 text-left">Critical incidents</th>
                  <th className="p-2 text-left">Overdue corrective actions</th>
                  <th className="p-2 text-left">Missed daily checklists</th>
                  <th className="p-2 text-left">Temperature breaches (7d)</th>
                </tr>
              </thead>
              <tbody>
                {siteHistory.map((entry) => (
                  <tr key={entry.score_date} className="border-t border-white/10 text-slate-200">
                    <td className="p-2">{format(new Date(entry.score_date), "dd MMM yyyy")}</td>
                    <td className="p-2">{formatPercent(entry.score)}</td>
                    <td className="p-2">{entry.open_critical_incidents}</td>
                    <td className="p-2">{entry.overdue_corrective_actions}</td>
                    <td className="p-2">{entry.missed_daily_checklists}</td>
                    <td className="p-2">{entry.temperature_breaches_last_7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}