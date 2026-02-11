'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Star } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';
import { ChartWidgetCard, ChartWidgetSkeleton } from './ChartWidgetCard';

interface EHOScoreChartProps {
  siteId: string;
  companyId: string;
}

interface CategoryScore {
  category: string;
  short: string;
  found: number;
  total: number;
  pct: number;
}

interface StarRating {
  stars: number;
  label: string;
  color: string;
}

function getStarRating(pct: number, expiring: number, expired: number): StarRating {
  const adjusted = Math.max(0, pct - (expired * 3) - (expiring * 1));
  if (adjusted >= 90) return { stars: 5, label: 'Very Good', color: '#10B981' };
  if (adjusted >= 75) return { stars: 4, label: 'Good', color: '#10B981' };
  if (adjusted >= 60) return { stars: 3, label: 'Generally Satisfactory', color: '#F59E0B' };
  if (adjusted >= 40) return { stars: 2, label: 'Improvement Necessary', color: '#F97316' };
  if (adjusted >= 20) return { stars: 1, label: 'Major Improvement Necessary', color: '#EF4444' };
  return { stars: 0, label: 'Urgent Improvement', color: '#EF4444' };
}

// Requirement categories and their total counts (from 47 EHO requirements)
const CATEGORY_TOTALS: Record<string, { total: number; short: string }> = {
  'Food Safety': { total: 10, short: 'Food' },
  'Health & Safety': { total: 10, short: 'H&S' },
  'Fire Safety': { total: 6, short: 'Fire' },
  'Training': { total: 4, short: 'Training' },
  'Cleaning': { total: 3, short: 'Clean' },
  'Equipment': { total: 4, short: 'Equip' },
  'Legal': { total: 4, short: 'Legal' },
  'Compliance': { total: 3, short: 'Comp' },
};

// Document name mappings for fuzzy matching
const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
  'Food Safety': ['food safety policy', 'haccp plan', 'allergen management policy'],
  'Health & Safety': ['health & safety policy', 'competent person appointment'],
  'Fire Safety': ['fire safety policy'],
  'Cleaning': ['cleaning schedule'],
  'Equipment': ['gas safety certificate', 'electrical installation certificate'],
  'Legal': ['public liability insurance', 'employers liability insurance', 'premises licence', 'food business registration'],
  'Compliance': ['standard operating procedures', 'waste management policy', 'staff handbook'],
};

export default function EHOScoreChart({ siteId, companyId }: EHOScoreChartProps) {
  const [categories, setCategories] = useState<CategoryScore[]>([]);
  const [overallPct, setOverallPct] = useState(0);
  const [expiring, setExpiring] = useState(0);
  const [expired, setExpired] = useState(0);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const effectiveSiteId = siteId && siteId !== 'all' ? siteId : null;
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Fetch all data in parallel
        const [docsResult, coshhResult, raResult, trainingResult, patResult, templatesResult, completionsResult, tempResult, incidentsResult] = await Promise.all([
          supabase.from('global_documents').select('category, name, expiry_date, is_active').eq('company_id', companyId).eq('is_active', true),
          supabase.from('coshh_data_sheets').select('product_name, expiry_date, status').eq('company_id', companyId).eq('status', 'Active'),
          supabase.from('risk_assessments').select('template_type, title, next_review_date, status').eq('company_id', companyId).eq('status', 'Published'),
          effectiveSiteId
            ? supabase.from('training_bookings').select('course, status').eq('site_id', effectiveSiteId)
            : supabase.from('training_bookings').select('course, status').eq('company_id', companyId),
          effectiveSiteId
            ? supabase.from('pat_appliances').select('id, has_current_pat_label').eq('site_id', effectiveSiteId).eq('company_id', companyId)
            : supabase.from('pat_appliances').select('id, has_current_pat_label').eq('company_id', companyId),
          supabase.from('task_templates').select('category, name, slug, is_active').or(`company_id.is.null,company_id.eq.${companyId}`).eq('is_active', true),
          effectiveSiteId
            ? supabase.from('task_completion_records').select('template_id, task_templates!inner(category, name), completed_at').eq('site_id', effectiveSiteId).gte('completed_at', thirtyDaysAgo)
            : supabase.from('task_completion_records').select('template_id, task_templates!inner(category, name), completed_at').eq('company_id', companyId).gte('completed_at', thirtyDaysAgo),
          effectiveSiteId
            ? supabase.from('temperature_logs').select('id, recorded_at').eq('site_id', effectiveSiteId).gte('recorded_at', thirtyDaysAgo)
            : supabase.from('temperature_logs').select('id, recorded_at').eq('company_id', companyId).gte('recorded_at', thirtyDaysAgo),
          effectiveSiteId
            ? supabase.from('incidents').select('id').eq('site_id', effectiveSiteId)
            : supabase.from('incidents').select('id').eq('company_id', companyId),
        ]);

        const docs = docsResult.data || [];
        const coshh = coshhResult.data || [];
        const ras = raResult.data || [];
        const training = trainingResult.data || [];
        const pat = patResult.data || [];
        const templates = templatesResult.data || [];
        const completions = completionsResult.data || [];
        const temps = tempResult.data || [];
        const incidents = incidentsResult.data || [];

        // Track expiring/expired documents
        let expiringCount = 0;
        let expiredCount = 0;
        docs.forEach((d: any) => {
          if (d.expiry_date) {
            const exp = new Date(d.expiry_date);
            if (exp < now) expiredCount++;
            else if (exp < thirtyDaysFromNow) expiringCount++;
          }
        });

        // Calculate per-category scores
        const scores: Record<string, number> = {};

        // Food Safety (10 requirements)
        let foodFound = 0;
        // 3 document requirements
        (DOCUMENT_REQUIREMENTS['Food Safety'] || []).forEach(reqName => {
          if (docs.some((d: any) => d.name.toLowerCase().includes(reqName.substring(0, 15)))) foodFound++;
        });
        // 2 training requirements
        if (training.some((t: any) => t.course?.toLowerCase().includes('food hygiene'))) foodFound++;
        if (training.some((t: any) => t.course?.toLowerCase().includes('allergen'))) foodFound++;
        // temp logs
        if (temps.length > 0) foodFound++;
        // 4 completion requirements (fridge, hot holding, opening, closing checklists)
        const completionCategories = completions.map((c: any) => (c.task_templates as any)?.name?.toLowerCase() || '');
        if (completionCategories.some((n: string) => n.includes('fridge') || n.includes('temperature'))) foodFound++;
        if (completionCategories.some((n: string) => n.includes('hot hold'))) foodFound++;
        if (completionCategories.some((n: string) => n.includes('opening'))) foodFound++;
        if (completionCategories.some((n: string) => n.includes('closing'))) foodFound++;
        scores['Food Safety'] = foodFound;

        // Health & Safety (10 requirements)
        let hsFound = 0;
        (DOCUMENT_REQUIREMENTS['Health & Safety'] || []).forEach(reqName => {
          if (docs.some((d: any) => d.name.toLowerCase().includes(reqName.substring(0, 15)))) hsFound++;
        });
        if (incidents.length > 0) hsFound += 2; // accident book + riddor
        // Risk assessments
        if (ras.some((r: any) => r.template_type?.toLowerCase().includes('general'))) hsFound++;
        if (ras.some((r: any) => r.template_type?.toLowerCase().includes('coshh') || r.title?.toLowerCase().includes('coshh'))) hsFound++;
        if (ras.some((r: any) => r.template_type?.toLowerCase().includes('manual'))) hsFound++;
        // COSHH
        if (coshh.length > 0) hsFound += 2; // register + sheets
        if (docs.some((d: any) => d.name.toLowerCase().includes('coshh'))) hsFound++;
        scores['Health & Safety'] = Math.min(hsFound, 10);

        // Fire Safety (6 requirements)
        let fireFound = 0;
        if (ras.some((r: any) => r.template_type?.toLowerCase().includes('fire') || r.title?.toLowerCase().includes('fire'))) fireFound++;
        if (docs.some((d: any) => d.name.toLowerCase().includes('fire safety'))) fireFound++;
        if (completionCategories.some((n: string) => n.includes('fire alarm'))) fireFound++;
        if (completionCategories.some((n: string) => n.includes('fire extinguisher'))) fireFound++;
        if (completionCategories.some((n: string) => n.includes('emergency exit') || n.includes('assembly'))) fireFound++;
        if (completionCategories.some((n: string) => n.includes('emergency light'))) fireFound++;
        scores['Fire Safety'] = Math.min(fireFound, 6);

        // Training (4 requirements)
        let trainFound = 0;
        if (docs.some((d: any) => d.name.toLowerCase().includes('training matrix'))) trainFound++;
        if (training.some((t: any) => t.course?.toLowerCase().includes('health') && t.course?.toLowerCase().includes('safety'))) trainFound++;
        if (training.some((t: any) => t.course?.toLowerCase().includes('fire'))) trainFound++;
        if (training.some((t: any) => t.course?.toLowerCase().includes('first aid'))) trainFound++;
        scores['Training'] = trainFound;

        // Cleaning (3 requirements)
        let cleanFound = 0;
        if (docs.some((d: any) => d.name.toLowerCase().includes('cleaning schedule'))) cleanFound++;
        if (completionCategories.some((n: string) => n.includes('cleaning'))) cleanFound++;
        if (completionCategories.some((n: string) => n.includes('pest'))) cleanFound++;
        scores['Cleaning'] = cleanFound;

        // Equipment (4 requirements)
        let equipFound = 0;
        if (pat.length > 0) equipFound++;
        if (completionCategories.some((n: string) => n.includes('maintenance'))) equipFound++;
        if (docs.some((d: any) => d.name.toLowerCase().includes('gas safety'))) equipFound++;
        if (docs.some((d: any) => d.name.toLowerCase().includes('electrical'))) equipFound++;
        scores['Equipment'] = equipFound;

        // Legal (4 requirements)
        let legalFound = 0;
        (DOCUMENT_REQUIREMENTS['Legal'] || []).forEach(reqName => {
          if (docs.some((d: any) => d.name.toLowerCase().includes(reqName.substring(0, 15)))) legalFound++;
        });
        scores['Legal'] = legalFound;

        // Compliance (3 requirements)
        let compFound = 0;
        if (templates.some((t: any) => t.category?.toLowerCase().includes('sop'))) compFound++;
        if (docs.some((d: any) => d.name.toLowerCase().includes('waste management'))) compFound++;
        if (docs.some((d: any) => d.name.toLowerCase().includes('staff handbook'))) compFound++;
        scores['Compliance'] = compFound;

        // Build category data
        const catData: CategoryScore[] = Object.entries(CATEGORY_TOTALS).map(([cat, info]) => ({
          category: cat,
          short: info.short,
          found: scores[cat] || 0,
          total: info.total,
          pct: Math.round(((scores[cat] || 0) / info.total) * 100),
        }));

        const totalFound = catData.reduce((sum, c) => sum + c.found, 0);
        const totalReqs = catData.reduce((sum, c) => sum + c.total, 0);
        const pct = Math.round((totalFound / totalReqs) * 100);

        setCategories(catData);
        setOverallPct(pct);
        setExpiring(expiringCount);
        setExpired(expiredCount);
      } catch (err: any) {
        if (err?.code === '42P01') {
          // Table doesn't exist - graceful fallback
        } else {
          console.error('Error fetching EHO score:', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  const rating = useMemo(() => getStarRating(overallPct, expiring, expired), [overallPct, expiring, expired]);

  if (loading) return <ChartWidgetSkeleton />;

  // Radial chart data - need both current value and max for proper rendering
  const radialData = [
    { name: 'Score', value: overallPct, fill: rating.color },
  ];

  // Bar colors based on completion percentage - more vibrant
  const getBarColor = (pct: number) => {
    if (pct >= 80) return '#10B981'; // vibrant emerald
    if (pct >= 50) return '#F59E0B'; // vibrant amber
    return '#EF4444'; // vibrant red
  };

  return (
    <ChartWidgetCard title="EHO Readiness Score" module="checkly" viewAllHref="/compliance/eho-pack">
      <div className="flex gap-4 h-full">
        {/* Left: Star rating + radial gauge */}
        <div className="flex flex-col items-center justify-center min-w-[140px]">
          {/* Radial gauge */}
          <div className="relative w-[130px] h-[130px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={radialData}
                startAngle={90}
                endAngle={90 - (overallPct * 3.6)}
                barSize={12}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: ct.subtleBg }}
                  fill={rating.color}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: rating.color }}>
                {overallPct}%
              </span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < rating.stars
                        ? 'fill-current'
                        : 'text-black/20 dark:text-white/20'
                    }`}
                    style={{ color: i < rating.stars ? rating.color : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-medium mt-1" style={{ color: rating.color }}>
            {rating.label}
          </span>
          {(expired > 0 || expiring > 0) && (
            <div className="flex gap-2 mt-1.5">
              {expired > 0 && (
                <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                  {expired} expired
                </span>
              )}
              {expiring > 0 && (
                <span className="text-[9px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                  {expiring} expiring
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Category breakdown bars */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <BarChart
              data={categories}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke={ct.axis}
                tick={{ fontSize: 9, fill: ct.tick }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="short"
                stroke={ct.axis}
                tick={{ fontSize: 10, fill: ct.tick }}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: ct.tooltipBg,
                  border: `1px solid ${ct.tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: ct.tooltipText,
                }}
                formatter={(value: number, _name: string, entry: any) => [
                  `${entry.payload.found}/${entry.payload.total} (${value}%)`,
                  entry.payload.category,
                ]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={16}>
                {categories.map((cat, i) => (
                  <Cell key={i} fill={getBarColor(cat.pct)} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartWidgetCard>
  );
}
