'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '@/context/AppContext'
import {
  TrendingUp,
  Users,
  Star,
  Percent,
} from '@/components/ui/icons'
import {
  SmileyAngry,
  SmileySad,
  SmileyMeh,
  Smiley,
  SmileyWink,
} from '@phosphor-icons/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const RATING_CONFIG = [
  { value: 1, label: 'Awful', icon: SmileyAngry, colour: '#EF4444' },
  { value: 2, label: 'Bad', icon: SmileySad, colour: '#F97316' },
  { value: 3, label: 'Okay', icon: SmileyMeh, colour: '#EAB308' },
  { value: 4, label: 'Good', icon: Smiley, colour: '#22C55E' },
  { value: 5, label: 'Great', icon: SmileyWink, colour: '#10B981' },
]

interface SummaryData {
  avgRating: number
  totalResponses: number
  responseRate: number
  trend: number
}

interface TrendPoint {
  date: string
  avg_rating: number
  count: number
}

interface DistributionPoint {
  rating: number
  count: number
}

interface StaffRow {
  user_id: string
  name: string
  avg_rating: number
  count: number
  trend: number
}

function getDateRange(period: string) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()

  if (period === '7d') start.setDate(start.getDate() - 7)
  else if (period === '30d') start.setDate(start.getDate() - 30)
  else if (period === '90d') start.setDate(start.getDate() - 90)

  start.setHours(0, 0, 0, 0)

  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  }
}

export default function ShiftPulsePage() {
  const { profile, siteId, companyId } = useAppContext()
  const [period, setPeriod] = useState('30d')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [distribution, setDistribution] = useState<DistributionPoint[]>([])
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)

  const isManager = profile?.app_role && ['Admin', 'Owner', 'Manager'].includes(profile.app_role)

  const dateRange = useMemo(() => getDateRange(period), [period])

  useEffect(() => {
    if (!companyId || !isManager) return

    async function fetchData() {
      setLoading(true)
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      })
      if (siteId && siteId !== 'all') {
        params.set('site_id', siteId)
      }

      const qs = params.toString()

      try {
        const [summaryRes, trendRes, distRes, staffRes] = await Promise.all([
          fetch(`/api/teamly/shift-pulse/summary?${qs}`),
          fetch(`/api/teamly/shift-pulse/trend?${qs}`),
          fetch(`/api/teamly/shift-pulse/distribution?${qs}`),
          fetch(`/api/teamly/shift-pulse/by-staff?${qs}`),
        ])

        const [summaryData, trendData, distData, staffData] = await Promise.all([
          summaryRes.json(),
          trendRes.json(),
          distRes.json(),
          staffRes.json(),
        ])

        if (summaryData.success) setSummary(summaryData.data)
        if (trendData.success) setTrend(trendData.data)
        if (distData.success) setDistribution(distData.data)
        if (staffData.success) setStaff(staffData.data)
      } catch (err) {
        console.error('[ShiftPulse] Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [companyId, siteId, dateRange, isManager])

  if (!isManager) {
    return (
      <div className="p-8 text-center text-theme-tertiary">
        <p>This page is only available to managers and admins.</p>
      </div>
    )
  }

  const maxDistCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Shift Pulse</h1>
          <p className="text-sm text-theme-tertiary mt-1">Staff shift satisfaction ratings</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-theme-surface border border-theme rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-teamly-dark/10 dark:bg-teamly/10 text-teamly-dark dark:text-teamly font-medium'
                  : 'text-theme-tertiary hover:text-theme-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Average Rating"
          value={summary ? `${summary.avgRating} / 5` : '-'}
          icon={Star}
          loading={loading}
        />
        <StatCard
          label="Total Responses"
          value={summary?.totalResponses ?? '-'}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Response Rate"
          value={summary ? `${summary.responseRate}%` : '-'}
          icon={Percent}
          loading={loading}
        />
        <StatCard
          label="Trend"
          value={
            summary
              ? summary.trend > 0
                ? `+${summary.trend}`
                : summary.trend === 0
                  ? 'No change'
                  : `${summary.trend}`
              : '-'
          }
          icon={TrendingUp}
          loading={loading}
          trendDirection={summary ? (summary.trend > 0 ? 'up' : summary.trend < 0 ? 'down' : 'flat') : undefined}
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <h2 className="text-base font-semibold text-theme-primary mb-4">Rating Trend</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-theme-tertiary text-sm">Loading...</div>
        ) : trend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-theme-tertiary text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--text-tertiary, #888)' }}
                tickFormatter={(d: string) => {
                  const date = new Date(d)
                  return `${date.getDate()}/${date.getMonth() + 1}`
                }}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 12, fill: 'var(--text-tertiary, #888)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface, #1C1916)',
                  border: '1px solid var(--border, #333)',
                  borderRadius: '8px',
                  fontSize: 13,
                }}
                formatter={(value: number) => [`${value} avg`, 'Rating']}
                labelFormatter={(label: string) => {
                  const d = new Date(label)
                  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_rating"
                stroke="#D37E91"
                strokeWidth={2}
                dot={{ fill: '#D37E91', r: 3 }}
                activeDot={{ r: 5, fill: '#D37E91' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom section — Distribution + Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h2 className="text-base font-semibold text-theme-primary mb-4">Rating Distribution</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-theme-tertiary text-sm">Loading...</div>
          ) : (
            <div className="space-y-3">
              {RATING_CONFIG.map((rc) => {
                const d = distribution.find(x => x.rating === rc.value)
                const count = d?.count ?? 0
                const pct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0
                const Icon = rc.icon

                return (
                  <div key={rc.value} className="flex items-center gap-3">
                    <Icon weight="duotone" style={{ color: rc.colour, width: 24, height: 24, flexShrink: 0 }} />
                    <span className="text-xs text-theme-tertiary w-10">{rc.label}</span>
                    <div className="flex-1 h-6 bg-theme-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: rc.colour }}
                      />
                    </div>
                    <span className="text-sm font-medium text-theme-secondary w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Staff Breakdown */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h2 className="text-base font-semibold text-theme-primary mb-4">Staff Breakdown</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-theme-tertiary text-sm">Loading...</div>
          ) : staff.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-theme-tertiary text-sm">No data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left py-2 text-theme-tertiary font-medium">Name</th>
                    <th className="text-right py-2 text-theme-tertiary font-medium">Avg</th>
                    <th className="text-right py-2 text-theme-tertiary font-medium">Count</th>
                    <th className="text-right py-2 text-theme-tertiary font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.user_id} className="border-b border-theme/50">
                      <td className="py-2.5 text-theme-primary">{s.name}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className="font-medium"
                          style={{ color: getRatingColour(s.avg_rating) }}
                        >
                          {s.avg_rating}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-theme-secondary">{s.count}</td>
                      <td className="py-2.5 text-right">
                        {s.trend > 0 && <span className="text-green-500">+{s.trend}</span>}
                        {s.trend < 0 && <span className="text-red-500">{s.trend}</span>}
                        {s.trend === 0 && <span className="text-theme-tertiary">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Helper components ---

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  trendDirection,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  loading: boolean
  trendDirection?: 'up' | 'down' | 'flat'
}) {
  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg border bg-teamly/20 text-teamly border-teamly/30">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-theme-secondary">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${
        trendDirection === 'up'
          ? 'text-green-500'
          : trendDirection === 'down'
            ? 'text-red-500'
            : 'text-teamly'
      }`}>
        {loading ? '...' : value}
      </div>
    </div>
  )
}

function getRatingColour(avg: number): string {
  if (avg < 1.5) return '#EF4444'
  if (avg < 2.5) return '#F97316'
  if (avg < 3.5) return '#EAB308'
  if (avg < 4.5) return '#22C55E'
  return '#10B981'
}
