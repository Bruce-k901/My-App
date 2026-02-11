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

const CERT_TYPES = [
  { key: 'food_safety', label: 'Food Safety', icon: GraduationCap, color: 'blue',
    trainedField: 'food_safety_level', expiryField: 'food_safety_expiry_date', isBool: false },
  { key: 'h_and_s', label: 'Health & Safety', icon: Shield, color: 'indigo',
    trainedField: 'h_and_s_level', expiryField: 'h_and_s_expiry_date', isBool: false },
  { key: 'fire_marshal', label: 'Fire Marshal', icon: Flame, color: 'orange',
    trainedField: 'fire_marshal_trained', expiryField: 'fire_marshal_expiry_date', isBool: true },
  { key: 'first_aid', label: 'First Aid', icon: HeartPulse, color: 'red',
    trainedField: 'first_aid_trained', expiryField: 'first_aid_expiry_date', isBool: true },
  { key: 'cossh', label: 'COSHH / Allergen', icon: Beaker, color: 'purple',
    trainedField: 'cossh_trained', expiryField: 'cossh_expiry_date', isBool: true },
] as const;

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

    // Check if function is known to be broken (cached in sessionStorage)
    const functionBrokenKey = 'get_expiring_training_broken';
    const isFunctionBroken = typeof window !== 'undefined' && sessionStorage.getItem(functionBrokenKey) === 'true';
    
    if (isFunctionBroken) {
      setExpiring([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_expiring_training', {
        p_company_id: profile.company_id,
        p_days_ahead: 60
      });
      
      // If function doesn't exist (404) or bad request (400), return empty array
      if (error) {
        const errorStr = JSON.stringify(error).toLowerCase();
        const errorCode = error.code || '';
        const errorMessage = (error.message || '').toLowerCase();
        const errorDetails = (error.details || '').toLowerCase();
        const errorHint = (error.hint || '').toLowerCase();
        
        // Check if error object is empty (common with 400 errors)
        const isEmptyError = Object.keys(error).length === 0 || errorStr === '{}';
        
        // Check for 404 or 400 errors in various formats
        const is404 = errorCode === 'PGRST116' || 
                     errorMessage.includes('404') || 
                     errorMessage.includes('not found') ||
                     errorStr.includes('404') ||
                     errorStr.includes('not found');
        
        const is400 = isEmptyError ||
                     errorCode === 'PGRST204' || 
                     errorMessage.includes('400') || 
                     errorMessage.includes('bad request') ||
                     errorDetails.includes('400') ||
                     errorHint.includes('400') ||
                     errorStr.includes('400') ||
                     errorStr.includes('bad request');
        
        // Check for PostgreSQL schema errors (42703 = undefined_column, 42883 = undefined_function, etc.)
        const isSchemaError = errorCode === '42703' || // undefined_column
                             errorCode === '42883' || // undefined_function
                             errorCode === '42P01' ||  // undefined_table
                             errorMessage.includes('does not exist') ||
                             (errorMessage.includes('column') && errorMessage.includes('does not exist'));
        
        // If it's a 400, 404, or schema error, silently handle it (don't log)
        // Also cache that the function is broken to avoid future calls
        if (is404 || is400 || isSchemaError) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(functionBrokenKey, 'true');
          }
          setExpiring([]);
          return;
        }
        
        // Only log unexpected errors
        console.error('Error fetching expiring training:', error);
        setExpiring([]);
        return;
      }
      
      setExpiring(data || []);
    } catch (err: any) {
      // Silently handle missing function (404) or bad request (400) errors
      const errorStr = JSON.stringify(err || {}).toLowerCase();
      const errorCode = err?.code || '';
      const errorMessage = (err?.message || '').toLowerCase();
      
      const is404 = errorCode === 'PGRST116' || 
                   errorMessage.includes('404') || 
                   errorMessage.includes('not found') ||
                   errorStr.includes('404') ||
                   errorStr.includes('not found');
      
      const is400 = errorCode === 'PGRST204' || 
                   errorMessage.includes('400') || 
                   errorMessage.includes('bad request') ||
                   errorStr.includes('400') ||
                   errorStr.includes('bad request');
      
      // Check for PostgreSQL schema errors
      const isSchemaError = errorCode === '42703' || // undefined_column
                           errorCode === '42883' || // undefined_function
                           errorCode === '42P01' ||  // undefined_table
                           errorMessage.includes('does not exist') ||
                           (errorMessage.includes('column') && errorMessage.includes('does not exist'));
      
      // If it's a 400, 404, or schema error, silently handle it
      // Also cache that the function is broken to avoid future calls
      if (is404 || is400 || isSchemaError) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(functionBrokenKey, 'true');
        }
        setExpiring([]);
        return;
      }
      // Only log unexpected errors
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

    const columns = [
      'id',
      'food_safety_level', 'food_safety_expiry_date',
      'h_and_s_level', 'h_and_s_expiry_date',
      'fire_marshal_trained', 'fire_marshal_expiry_date',
      'first_aid_trained', 'first_aid_expiry_date',
      'cossh_trained', 'cossh_expiry_date',
    ].join(',');

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(columns)
      .eq('company_id', profile.company_id);

    if (error || !profiles) {
      console.warn('Failed to fetch profiles for cert stats:', error);
      return;
    }

    const now = new Date();
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const computed: CertStat[] = CERT_TYPES.map(cert => {
      let valid = 0, expired = 0, expiringSoon = 0, missing = 0;

      for (const p of profiles) {
        const trained = (p as any)[cert.trainedField];
        const expiryStr = (p as any)[cert.expiryField] as string | null;

        const hasCert = cert.isBool ? trained === true : trained != null && trained > 0;

        if (!hasCert) {
          missing++;
          continue;
        }

        if (!expiryStr) {
          // Trained but no expiry date recorded - count as valid (no expiry tracked)
          valid++;
          continue;
        }

        const expiry = new Date(expiryStr);
        if (expiry < now) {
          expired++;
        } else if (expiry <= thirtyDaysOut) {
          expiringSoon++;
        } else {
          valid++;
        }
      }

      return {
        key: cert.key,
        label: cert.label,
        icon: cert.icon,
        color: cert.color,
        total: profiles.length,
        valid,
        expired,
        expiringSoon,
        missing,
      };
    });

    setCertStats(computed);

    // Compute overview from profiles if the view-based one failed
    const totalEmployees = profiles.length;
    const fullyCompliant = profiles.filter(p => {
      return CERT_TYPES.every(cert => {
        const trained = (p as any)[cert.trainedField];
        const expiryStr = (p as any)[cert.expiryField] as string | null;
        const hasCert = cert.isBool ? trained === true : trained != null && trained > 0;
        if (!hasCert) return false;
        if (!expiryStr) return true;
        return new Date(expiryStr) >= now;
      });
    }).length;

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training & Certifications</h1>
          <p className="text-gray-600 dark:text-white/70">Track compliance and certification expiry</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/people/training/record"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg border-0 shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_16px_rgba(59,130,246,0.6)] dark:hover:shadow-[0_0_16px_rgba(59,130,246,0.7)] transition-all duration-200 ease-in-out font-medium"
          >
            <Plus className="w-5 h-5" />
            Record Training
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      {effectiveOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm mb-1">
              <Users className="w-4 h-4" />
              Total Staff
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{effectiveOverview.total_employees}</p>
          </div>
          <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Fully Compliant
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{effectiveOverview.fully_compliant}</p>
          </div>
          <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Expiring (30d)
            </div>
            <p className={`text-2xl font-bold ${effectiveOverview.expiring_30_days > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
              {effectiveOverview.expiring_30_days}
            </p>
          </div>
          <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-white/70 text-sm mb-1">
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Certifications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certStats.map((cert) => {
              const CertIcon = cert.icon;
              const complianceRate = cert.total > 0 ? Math.round((cert.valid / cert.total) * 100) : 0;
              return (
                <Link
                  key={cert.key}
                  href={`/dashboard/training?highlight=${cert.key}`}
                  className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${cert.color}-100 dark:bg-${cert.color}-500/20`}>
                      <CertIcon className={`w-5 h-5 text-${cert.color}-600 dark:text-${cert.color}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{cert.label}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">{cert.total} staff</p>
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
                      <span className="flex items-center gap-1 text-gray-500 dark:text-white/50">
                        <AlertTriangle className="w-3 h-3" /> {cert.missing}
                      </span>
                    )}
                    <span className="ml-auto font-semibold text-gray-900 dark:text-white">{complianceRate}%</span>
                  </div>

                  <div className="mt-2 w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
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
                  <span className="text-gray-900 dark:text-white">{item.employee_name}</span>
                  <span className="text-gray-600 dark:text-white/70"> - {item.course_name}</span>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/[0.03] border border-blue-300 dark:border-blue-500/50 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-50 dark:bg-blue-500/20 border border-blue-500 dark:border-blue-500 text-blue-700 dark:text-blue-300' 
                  : 'bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-white/70 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
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
            className="block bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  course.is_mandatory ? 'bg-red-500/20 dark:bg-red-500/20' : 'bg-blue-500/10 dark:bg-blue-500/20'
                }`}>
                  <GraduationCap className={`w-6 h-6 ${course.is_mandatory ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-white font-medium">{course.course_name}</p>
                    {course.is_mandatory && (
                      <span className="px-2 py-0.5 bg-red-500/20 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-xs rounded font-medium">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-white/70">
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
                    <p className="text-gray-500 dark:text-white/50 text-xs">Valid</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-medium ${course.expiring_30_days > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-white/50'}`}>
                      {course.expiring_30_days}
                    </p>
                    <p className="text-gray-500 dark:text-white/50 text-xs">Expiring</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-medium ${course.expired > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-white/50'}`}>
                      {course.expired}
                    </p>
                    <p className="text-gray-500 dark:text-white/50 text-xs">Expired</p>
                  </div>
                </div>
                
                {/* Compliance Rate */}
                <div className="w-20 text-right">
                  <p className={`text-lg font-bold ${getComplianceColor(course.compliance_percentage || 0)}`}>
                    {course.compliance_percentage || 0}%
                  </p>
                  <p className="text-gray-500 dark:text-white/50 text-xs">Compliance</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-500 dark:text-white/50" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredStats.length === 0 && (
        <div className="bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] rounded-lg p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-500 dark:text-white/50 mx-auto mb-4" />
          <p className="text-gray-900 dark:text-white font-medium">No training courses configured</p>
          <p className="text-gray-600 dark:text-white/70 text-sm mt-1">
            {certStats.length > 0
              ? 'Certificate data is shown above from employee profiles. Add training courses to track course-level compliance.'
              : 'Try adjusting your filters or add training courses to your system.'}
          </p>
          <Link
            href="/dashboard/people/training/matrix"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Compliance Matrix <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

