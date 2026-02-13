'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  ChevronRight,
  Plus,
  Search,
  Shield,
  Flame,
  HeartPulse,
  Beaker,
  XCircle,
} from '@/components/ui/icons';
import type { TrainingStats, CompanyTrainingOverview } from '@/types/teamly';

interface ExpiringTraining {
  record_id: string;
  profile_id: string;
  employee_name: string;
  course_name: string;
  course_code: string;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
}

interface CertStat {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  total: number;
  valid: number;
  expired: number;
  expiringSoon: number;
  missing: number;
}

// Map course codes → certification categories (same codes used by Training Matrix)
const CERT_CATEGORIES: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  courseCodes: string[];
}[] = [
  { key: 'food_safety', label: 'Food Safety', icon: GraduationCap, color: 'blue',
    courseCodes: ['FS-L2', 'FS-L3'] },
  { key: 'h_and_s', label: 'Health & Safety', icon: Shield, color: 'indigo',
    courseCodes: ['HS-L2', 'HS-L3'] },
  { key: 'fire_marshal', label: 'Fire Marshal', icon: Flame, color: 'orange',
    courseCodes: ['FIRE'] },
  { key: 'first_aid', label: 'First Aid', icon: HeartPulse, color: 'red',
    courseCodes: ['FAW', 'FIRST-AID'] },
  { key: 'cossh', label: 'COSHH / Allergen', icon: Beaker, color: 'purple',
    courseCodes: ['COSHH', 'ALLERGY'] },
];

export default function TrainingPage() {
  const { profile } = useAppContext();
  const [stats, setStats] = useState<TrainingStats[]>([]);
  const [expiring, setExpiring] = useState<ExpiringTraining[]>([]);
  const [overview, setOverview] = useState<CompanyTrainingOverview | null>(null);
  const [certStats, setCertStats] = useState<CertStat[]>([]);
  const [profileOverview, setProfileOverview] = useState<CompanyTrainingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile?.company_id) {
      fetchData();
    }
  }, [profile?.company_id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchExpiring(), fetchOverview(), fetchCertStats()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const { data } = await supabase
      .from('training_stats_view')
      .select('*')
      .eq('company_id', profile?.company_id)
      .order('is_mandatory', { ascending: false })
      .order('category')
      .order('course_name');
    
    setStats(data || []);
  };

  const fetchExpiring = async () => {
    if (!profile?.company_id) {
      setExpiring([]);
      return;
    }

    try {
      // Read from compliance_matrix_view — same source as Training Matrix
      const { data, error } = await supabase
        .from('compliance_matrix_view')
        .select('profile_id, full_name, course_id, course_name, course_code, expiry_date, compliance_status')
        .eq('company_id', profile.company_id)
        .not('expiry_date', 'is', null);

      if (error) {
        // Silently handle view-not-found errors
        if (error.code === '42P01') {
          setExpiring([]);
          return;
        }
        console.error('Error fetching expiring training:', error);
        setExpiring([]);
        return;
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const sixtyDaysOut = new Date(now);
      sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

      const expiringItems: ExpiringTraining[] = (data || [])
        .filter((row: any) => {
          if (!row.expiry_date) return false;
          const expiry = new Date(row.expiry_date);
          // Include if expired OR expiring within 60 days
          return expiry <= sixtyDaysOut;
        })
        .map((row: any) => {
          const expiry = new Date(row.expiry_date);
          expiry.setHours(0, 0, 0, 0);
          const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            record_id: `${row.profile_id}-${row.course_id}`,
            profile_id: row.profile_id,
            employee_name: row.full_name || 'Unknown',
            course_name: row.course_name,
            course_code: row.course_code || '',
            expiry_date: row.expiry_date,
            days_until_expiry: daysUntil,
            is_expired: daysUntil < 0,
          };
        })
        .sort((a: ExpiringTraining, b: ExpiringTraining) => a.days_until_expiry - b.days_until_expiry);

      setExpiring(expiringItems);
    } catch (err: any) {
      console.error('Error fetching expiring training:', err);
      setExpiring([]);
    }
  };

  const fetchOverview = async () => {
    const { data, error } = await supabase
      .from('company_training_overview')
      .select('*')
      .eq('company_id', profile?.company_id)
      .single();

    if (!error) setOverview(data);
  };

  const fetchCertStats = async () => {
    if (!profile?.company_id) return;

    // Read from compliance_matrix_view — same source as Training Matrix
    const { data: matrixData, error } = await supabase
      .from('compliance_matrix_view')
      .select('profile_id, course_code, compliance_status, expiry_date')
      .eq('company_id', profile.company_id);

    if (error || !matrixData) {
      if (error?.code !== '42P01') {
        console.warn('Failed to fetch compliance matrix for cert stats:', error);
      }
      return;
    }

    // Build a set of unique profile IDs for total count
    const profileIds = new Set(matrixData.map((r: any) => r.profile_id));
    const totalEmployees = profileIds.size;

    // Build a lookup: course_code (uppercase) → category key
    const codeToCategory = new Map<string, string>();
    for (const cat of CERT_CATEGORIES) {
      for (const code of cat.courseCodes) {
        codeToCategory.set(code.toUpperCase(), cat.key);
      }
    }

    // Aggregate per-category stats
    const catCounts: Record<string, { valid: number; expired: number; expiringSoon: number; profilesWithCert: Set<string> }> = {};
    for (const cat of CERT_CATEGORIES) {
      catCounts[cat.key] = { valid: 0, expired: 0, expiringSoon: 0, profilesWithCert: new Set() };
    }

    for (const row of matrixData as any[]) {
      const code = (row.course_code || '').toUpperCase();
      const catKey = codeToCategory.get(code);
      if (!catKey) continue; // course not in any cert category

      const bucket = catCounts[catKey];
      const status = (row.compliance_status || '').toLowerCase();

      if (status === 'compliant' || status === 'current') {
        bucket.valid++;
        bucket.profilesWithCert.add(row.profile_id);
      } else if (status === 'expiring_soon') {
        bucket.expiringSoon++;
        bucket.profilesWithCert.add(row.profile_id);
      } else if (status === 'expired') {
        bucket.expired++;
        bucket.profilesWithCert.add(row.profile_id);
      }
      // 'required', 'optional', 'in_progress' → no cert, counted as missing
    }

    const computed: CertStat[] = CERT_CATEGORIES.map(cat => {
      const counts = catCounts[cat.key];
      const missing = totalEmployees - counts.profilesWithCert.size;
      return {
        key: cat.key,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        total: totalEmployees,
        valid: counts.valid,
        expired: counts.expired,
        expiringSoon: counts.expiringSoon,
        missing,
      };
    });

    setCertStats(computed);

    // Compute overview from same data if the view-based one failed
    // A profile is "fully compliant" if they have a valid cert in every category
    const compliantPerCategory = new Map<string, Set<string>>();
    for (const cat of CERT_CATEGORIES) {
      const validProfiles = new Set<string>();
      for (const row of matrixData as any[]) {
        const code = (row.course_code || '').toUpperCase();
        if (!cat.courseCodes.map(c => c.toUpperCase()).includes(code)) continue;
        const status = (row.compliance_status || '').toLowerCase();
        if (status === 'compliant' || status === 'current' || status === 'expiring_soon') {
          validProfiles.add(row.profile_id);
        }
      }
      compliantPerCategory.set(cat.key, validProfiles);
    }

    let fullyCompliant = 0;
    for (const pid of profileIds) {
      const isCompliant = CERT_CATEGORIES.every(cat => {
        const validSet = compliantPerCategory.get(cat.key);
        return validSet?.has(pid);
      });
      if (isCompliant) fullyCompliant++;
    }

    const expiring30 = computed.reduce((sum, c) => sum + c.expiringSoon, 0);
    const expiredCount = computed.reduce((sum, c) => sum + c.expired, 0);

    setProfileOverview({
      company_id: profile.company_id,
      total_employees: totalEmployees,
      fully_compliant: fullyCompliant,
      expiring_30_days: expiring30,
      expired_count: expiredCount,
    });
  };

  const effectiveOverview = overview || profileOverview;

  const categories = ['all', ...Array.from(new Set(stats.map(s => s.category)))];

  const filteredStats = stats.filter(s => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchQuery && !s.course_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-module-fg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Training & Certifications</h1>
          <p className="text-theme-secondary">Track compliance and certification expiry</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/people/training/record"
            className="flex items-center gap-2 px-4 py-2 bg-module-fg hover:bg-module-fg/90 text-white rounded-lg border-0 shadow-module-glow hover:shadow-module-glow transition-all duration-200 ease-in-out font-medium"
          >
            <Plus className="w-5 h-5" />
            Record Training
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      {effectiveOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-theme-surface border border-theme rounded-lg p-4">
            <div className="flex items-center gap-2 text-theme-secondary text-sm mb-1">
              <Users className="w-4 h-4" />
              Total Staff
            </div>
            <p className="text-2xl font-bold text-theme-primary">{effectiveOverview.total_employees}</p>
          </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4">
            <div className="flex items-center gap-2 text-theme-secondary text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Fully Compliant
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{effectiveOverview.fully_compliant}</p>
          </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4">
            <div className="flex items-center gap-2 text-theme-secondary text-sm mb-1">
              <Clock className="w-4 h-4" />
              Expiring (30d)
            </div>
            <p className={`text-2xl font-bold ${effectiveOverview.expiring_30_days > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-theme-primary'}`}>
              {effectiveOverview.expiring_30_days}
            </p>
          </div>
 <div className="bg-theme-surface border border-theme rounded-lg p-4">
            <div className="flex items-center gap-2 text-theme-secondary text-sm mb-1">
              <AlertTriangle className="w-4 h-4" />
              Expired
            </div>
            <p className={`text-2xl font-bold ${effectiveOverview.expired_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {effectiveOverview.expired_count}
            </p>
          </div>
        </div>
      )}

      {/* Certifications from Profile Data */}
      {certStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-theme-primary mb-3">Certifications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certStats.map((cert) => {
              const CertIcon = cert.icon;
              const complianceRate = cert.total > 0 ? Math.round((cert.valid / cert.total) * 100) : 0;
              return (
                <Link
                  key={cert.key}
                  href={`/dashboard/training?highlight=${cert.key}`}
 className="bg-theme-surface border border-theme rounded-lg p-4 hover:border-module-fg/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${cert.color}-100 dark:bg-${cert.color}-500/20`}>
                      <CertIcon className={`w-5 h-5 text-${cert.color}-600 dark:text-${cert.color}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-theme-primary">{cert.label}</p>
                      <p className="text-xs text-theme-tertiary">{cert.total} staff</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3" /> {cert.valid}
                    </span>
                    {cert.expiringSoon > 0 && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" /> {cert.expiringSoon}
                      </span>
                    )}
                    {cert.expired > 0 && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="w-3 h-3" /> {cert.expired}
                      </span>
                    )}
                    {cert.missing > 0 && (
                      <span className="flex items-center gap-1 text-theme-tertiary">
                        <AlertTriangle className="w-3 h-3" /> {cert.missing}
                      </span>
                    )}
                    <span className="ml-auto font-semibold text-theme-primary">{complianceRate}%</span>
                  </div>

                  <div className="mt-2 w-full bg-theme-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        complianceRate >= 90 ? 'bg-green-500' : complianceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${complianceRate}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiring Soon Alert */}
      {expiring.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-medium text-amber-700 dark:text-amber-300">Certifications Expiring Soon</h3>
          </div>
          <div className="space-y-2">
            {expiring.slice(0, 5).map((item) => (
              <div key={item.record_id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-theme-primary">{item.employee_name}</span>
                  <span className="text-theme-secondary"> - {item.course_name}</span>
                </div>
                <span className={item.is_expired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}>
                  {item.is_expired 
                    ? `Expired ${Math.abs(item.days_until_expiry)} days ago`
                    : `${item.days_until_expiry} days left`
                  }
                </span>
              </div>
            ))}
            {expiring.length > 5 && (
              <Link href="/dashboard/people/training/expiring" className="text-amber-600 dark:text-amber-400 text-sm hover:underline">
                View all {expiring.length} expiring →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-tertiary" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary placeholder:text-theme-tertiary focus:outline-none focus:ring-2 focus:ring-module-fg/40 focus:border-module-fg/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-module-fg/10 border border-module-fg text-module-fg'
                  : 'bg-theme-surface border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {filteredStats.map((course) => (
          <Link
            key={course.course_id}
            href={`/dashboard/people/training/course/${course.course_id}`}
 className="block bg-theme-surface border border-theme rounded-lg p-4 hover:border-module-fg/30 hover:bg-theme-hover transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  course.is_mandatory ? 'bg-red-500/20' : 'bg-module-fg/10'
                }`}>
                  <GraduationCap className={`w-6 h-6 ${course.is_mandatory ? 'text-red-600 dark:text-red-400' : 'text-module-fg'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-theme-primary font-medium">{course.course_name}</p>
                    {course.is_mandatory && (
                      <span className="px-2 py-0.5 bg-red-500/20 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs rounded font-medium">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-theme-secondary">
                    <span>{course.course_code}</span>
                    <span>•</span>
                    <span>{course.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Stats */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-green-600 dark:text-green-400 font-medium">{course.completed_valid}</p>
                    <p className="text-theme-tertiary text-xs">Valid</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-medium ${course.expiring_30_days > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-theme-tertiary'}`}>
                      {course.expiring_30_days}
                    </p>
                    <p className="text-theme-tertiary text-xs">Expiring</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-medium ${course.expired > 0 ? 'text-red-600 dark:text-red-400' : 'text-theme-tertiary'}`}>
                      {course.expired}
                    </p>
                    <p className="text-theme-tertiary text-xs">Expired</p>
                  </div>
                </div>
                
                {/* Compliance Rate */}
                <div className="w-20 text-right">
                  <p className={`text-lg font-bold ${getComplianceColor(course.compliance_percentage || 0)}`}>
                    {course.compliance_percentage || 0}%
                  </p>
                  <p className="text-theme-tertiary text-xs">Compliance</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-theme-tertiary" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredStats.length === 0 && (
 <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
          <GraduationCap className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
          <p className="text-theme-primary font-medium">No training courses configured</p>
          <p className="text-theme-secondary text-sm mt-1">
            {certStats.length > 0
              ? 'Certificate data is shown above from employee profiles. Add training courses to track course-level compliance.'
              : 'Try adjusting your filters or add training courses to your system.'}
          </p>
          <Link
            href="/dashboard/people/training/matrix"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm text-module-fg hover:underline"
          >
            View Compliance Matrix <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

