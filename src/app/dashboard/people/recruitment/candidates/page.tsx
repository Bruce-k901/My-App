'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Users, Star, Mail, Phone, FileText, MapPin, Calendar, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type Candidate = {
  id: string
  full_name: string
  email: string
  phone: string | null
  source: string | null
  overall_status: 'active' | 'hired' | 'rejected' | 'withdrawn'
  tags: string[] | null
  created_at: string
  latest_application?: {
    job_title: string
    status: string
    applied_at: string
  }
}

export default function CandidatesPage() {
  const { profile } = useAppContext()
  const companyId = profile?.company_id

  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hired' | 'rejected'>('all')
  const [filterJob, setFilterJob] = useState<string>('all')
  const [jobs, setJobs] = useState<Array<{id: string, title: string}>>([])
  const [searchTerm, setSearchTerm] = useState('')

  const loadJobs = async () => {
    if (!companyId) return
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const load = async () => {
    if (!companyId) return

    setLoading(true)
    try {
      // If filtering by specific job, get candidates who applied to that job
      if (filterJob !== 'all') {
        const { data: applications, error: appError } = await supabase
          .from('applications')
          .select(`
            status,
            applied_at,
            jobs!inner(title),
            candidates!inner (
              id,
              full_name,
              email,
              phone,
              source,
              overall_status,
              tags,
              created_at
            )
          `)
          .eq('job_id', filterJob)
          .order('applied_at', { ascending: false })
        
        if (appError) throw appError
        
        // Extract candidates with job info
        const candidatesWithJobs = applications?.map(app => ({
          ...app.candidates,
          latest_application: {
            job_title: app.jobs.title,
            status: app.status,
            applied_at: app.applied_at,
          }
        })) || []
        
        setCandidates(candidatesWithJobs as any)
      } else {
        // Load all candidates with their latest application
        const { data: candidatesData, error: candidatesError } = await supabase
          .from('candidates')
          .select(`
            id,
            full_name,
            email,
            phone,
            source,
            overall_status,
            tags,
            created_at
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (candidatesError) throw candidatesError

        // Filter by status if needed
        let filteredCandidates = candidatesData || []
        if (filterStatus !== 'all') {
          filteredCandidates = filteredCandidates.filter(c => c.overall_status === filterStatus)
        }

        // Get latest application for each candidate
        const candidatesWithJobs = await Promise.all(
          filteredCandidates.map(async (candidate) => {
            const { data: latestApp } = await supabase
              .from('applications')
              .select(`
                status,
                applied_at,
                jobs!inner(title)
              `)
              .eq('candidate_id', candidate.id)
              .order('applied_at', { ascending: false })
              .limit(1)
              .single()

            return {
              ...candidate,
              latest_application: latestApp ? {
                job_title: latestApp.jobs.title,
                status: latestApp.status,
                applied_at: latestApp.applied_at,
              } : undefined
            }
          })
        )

        setCandidates(candidatesWithJobs as Candidate[])
      }
    } catch (error: any) {
      console.error('Failed to load candidates:', error)
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) {
      loadJobs()
      load()
    }
  }, [companyId, filterStatus, filterJob])

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      hired: 'bg-green-500/10 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
      withdrawn: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    }
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const filteredCandidates = candidates.filter((c) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      c.full_name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Candidates</h1>
          <p className="text-sm text-gray-900 dark:text-white/60 mt-1">
            Track applications and manage candidates
          </p>
        </div>
        <Link
          href="/dashboard/people/recruitment"
          className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white/80"
        >
          View Jobs
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-white/30"
          />
          
          {/* Job Filter */}
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 [&>option]:bg-[#1a1d24] [&>option]:text-gray-900 [&>option]:dark:text-white min-w-[200px]"
          >
            <option value="all">All Jobs</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-[#EC4899]/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/60 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            All ({candidates.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              filterStatus === 'active'
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-[#EC4899]/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/60 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            Active ({candidates.filter((c) => c.overall_status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('hired')}
            className={`px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              filterStatus === 'hired'
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-[#EC4899]/30'
                : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/60 border border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            Hired ({candidates.filter((c) => c.overall_status === 'hired').length})
          </button>
        </div>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-900 dark:text-white/40 animate-spin" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-gray-900 dark:text-white/30 mx-auto mb-4" />
          <div className="text-gray-900 dark:text-white font-semibold text-lg">No candidates yet</div>
          <div className="text-gray-900 dark:text-white/60 text-sm mt-2 mb-4">
            {searchTerm
              ? 'No candidates match your search'
              : filterStatus === 'all'
              ? 'Candidates will appear here when they apply to your jobs'
              : `No ${filterStatus} candidates found`}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCandidates.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/dashboard/people/recruitment/candidates/${candidate.id}`}
              className="block bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Candidate Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-gray-900 dark:text-white font-semibold text-base">{candidate.full_name}</h3>
                    {getStatusBadge(candidate.overall_status)}
                  </div>

                  {/* Job Applied For */}
                  {candidate.latest_application && (
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-[#EC4899]/30">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {candidate.latest_application.job_title}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {/* Email */}
                    <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/60">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{candidate.email}</span>
                    </div>

                    {/* Phone */}
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/60">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}

                    {/* Source */}
                    {candidate.source && (
                      <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/60">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{candidate.source}</span>
                      </div>
                    )}

                    {/* Applied Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-white/60">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Applied {new Date(candidate.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Latest Application */}
                  {candidate.latest_application && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-900 dark:text-white/50">Latest:</span>
                      <span className="text-gray-900 dark:text-white/70">{candidate.latest_application.job_title}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white/70">
                        {candidate.latest_application.status}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {candidate.tags && candidate.tags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {candidate.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                      {candidate.tags.length > 3 && (
                        <span className="text-xs text-gray-900 dark:text-white/50">+{candidate.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Quick Actions */}
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      window.open(`mailto:${candidate.email}`, '_blank')
                    }}
                    className="px-3 py-1.5 rounded text-xs bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
                  >
                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                    Email
                  </button>
                  <div className="text-xs text-gray-900 dark:text-white/40 text-right">
                    View profile →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
