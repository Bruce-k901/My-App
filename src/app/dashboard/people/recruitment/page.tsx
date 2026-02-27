'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Briefcase, Users, DollarSign, MapPin, Eye, Edit, Copy, Trash2 } from '@/components/ui/icons'
import { toast } from 'sonner'

type Job = {
  id: string
  title: string
  description: string | null
  department: string | null
  location: string | null
  boh_foh: 'FOH' | 'BOH' | 'BOTH'
  pay_type: 'hourly' | 'salaried'
  pay_rate_min: number | null
  pay_rate_max: number | null
  status: 'draft' | 'open' | 'paused' | 'closed'
  is_published: boolean
  published_at: string | null
  created_at: string
  application_count?: number
}

export default function RecruitmentJobsPage() {
  const { profile, companyId } = useAppContext()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'draft' | 'closed'>('all')

  const load = async () => {
    if (!companyId) return

    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error

      // TODO: Get application counts for each job
      setJobs((data || []) as Job[])
    } catch (error: any) {
      console.error('Failed to load jobs:', error)
      toast.error('Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) load()
  }, [companyId, filterStatus])

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-green-500/10 text-green-400 border-green-500/30',
      draft: 'bg-theme-surface-elevated0/10 text-theme-tertiary border-gray-500/30',
      paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      closed: 'bg-red-500/10 text-red-400 border-red-500/30',
    }
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredJobs = jobs

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-theme-primary">Jobs</h1>
          <p className="text-sm text-theme-primary/60 mt-1">
            Manage job postings and track applications
          </p>
        </div>
        <Link
          href="/dashboard/people/recruitment/jobs/new"
          className="px-4 py-2 rounded-lg text-sm bg-transparent text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:shadow-module-glow dark:hover:shadow-module-glow transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            filterStatus === 'all'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400/30'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          All Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            filterStatus === 'open'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400/30'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          Open ({jobs.filter((j) => j.status === 'open').length})
        </button>
        <button
          onClick={() => setFilterStatus('draft')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            filterStatus === 'draft'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400/30'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          Draft ({jobs.filter((j) => j.status === 'draft').length})
        </button>
        <button
          onClick={() => setFilterStatus('closed')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
            filterStatus === 'closed'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400/30'
              : 'bg-gray-100 dark:bg-white/5 text-theme-primary/60 border border-theme hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          Closed ({jobs.filter((j) => j.status === 'closed').length})
        </button>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-theme-primary/40 animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-theme-surface border border-theme rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-theme-primary/30 mx-auto mb-4" />
          <div className="text-theme-primary font-semibold text-lg">No jobs yet</div>
          <div className="text-theme-primary/60 text-sm mt-2 mb-4">
            {filterStatus === 'all'
              ? 'Create your first job posting to start hiring'
              : `No ${filterStatus} jobs found`}
          </div>
          {filterStatus === 'all' && (
            <Link
              href="/dashboard/people/recruitment/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-transparent text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:shadow-module-glow dark:hover:shadow-module-glow transition-all"
            >
              <Plus className="w-4 h-4" />
              Post Your First Job
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-theme-surface border border-theme rounded-xl p-5 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-theme-primary font-semibold text-base truncate">{job.title}</h3>
                  {job.department && (
                    <p className="text-theme-primary/50 text-xs mt-0.5">{job.department}</p>
                  )}
                </div>
                {getStatusBadge(job.status)}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {/* Location */}
                {job.location && (
                  <div className="flex items-center gap-2 text-xs text-theme-primary/60">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{job.location}</span>
                  </div>
                )}

                {/* Pay */}
                {(job.pay_rate_min || job.pay_rate_max) && (
                  <div className="flex items-center gap-2 text-xs text-theme-primary/60">
                    <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {job.pay_rate_min && `£${job.pay_rate_min}`}
                      {job.pay_rate_min && job.pay_rate_max && ' - '}
                      {job.pay_rate_max && `£${job.pay_rate_max}`}
                      {' '}{job.pay_type === 'hourly' ? '/hr' : '/year'}
                    </span>
                  </div>
                )}

                {/* Type Badges */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {job.boh_foh}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    {job.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                  </span>
                </div>

                {/* Applicants */}
                <div className="flex items-center gap-2 text-xs text-theme-primary/60 pt-2">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{job.application_count || 0} applicants</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-theme">
                <Link
                  href={`/dashboard/people/recruitment/${job.id}`}
                  className="flex-1 px-3 py-1.5 rounded text-xs bg-theme-muted hover:bg-gray-200 dark:hover:bg-white/15 border border-theme text-theme-primary text-center"
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  View
                </Link>
                <Link
                  href={`/dashboard/people/recruitment/jobs/${job.id}/edit`}
                  className="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-theme text-theme-primary/80"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
