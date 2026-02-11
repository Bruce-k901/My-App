'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, ArrowLeft, Edit, Share2, ExternalLink, Users, 
  DollarSign, MapPin, Briefcase, Calendar, Copy, CheckCircle
} from '@/components/ui/icons'
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
  contract_type: string | null
  contract_hours: number | null
  required_skills: string[] | null
  required_certifications: string[] | null
  experience_required: string | null
  status: string
  is_published: boolean
  published_at: string | null
  created_at: string
}

export default function JobDetailsPage() {
  const params = useParams()
  const { profile } = useAppContext()
  const companyId = profile?.company_id
  const jobId = params.jobId as string

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<Job | null>(null)
  const [applicationCount, setApplicationCount] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const load = async () => {
    if (!companyId || !jobId) return

    setLoading(true)
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('company_id', companyId)
        .single()

      if (jobError) throw jobError
      setJob(jobData)

      // Get application count
      const { count } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)

      setApplicationCount(count || 0)
    } catch (error: any) {
      console.error('Failed to load job:', error)
      toast.error('Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [companyId, jobId])

  const getJobBoardUrl = (board: string) => {
    if (!job) return ''

    const title = encodeURIComponent(job.title)
    const description = encodeURIComponent(job.description || '')
    const location = encodeURIComponent(job.location || 'UK')
    
    const urls: Record<string, string> = {
      indeed: `https://employers.indeed.com/post-a-job`,
      caterer: `https://www.caterer.com/post-a-job`,
      linkedin: `https://www.linkedin.com/jobs/post/`,
      totaljobs: `https://www.totaljobs.com/recruiter/post-a-job`,
      reed: `https://www.reed.co.uk/recruiter/post-a-job`,
    }
    
    return urls[board] || '#'
  }

  const createJobSlug = (title: string, id: string) => {
    // Create URL-friendly slug from job title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
    
    // Use last segment of UUID (12 chars after last hyphen)
    const uuidParts = id.split('-')
    const shortId = uuidParts[uuidParts.length - 1]
    return `${slug}-${shortId}`
  }

  const getPublicJobUrl = () => {
    if (!job || typeof window === 'undefined') return ''
    const slug = createJobSlug(job.title, job.id)
    return `${window.location.origin}/jobs/${slug}`
  }

  const copyJobUrl = () => {
    // Only allow copying URL if job is published
    if (!job || !job.is_published || job.status !== 'open') {
      toast.error('Please publish the job before sharing. Click "Publish Job" in edit mode.')
      return
    }

    const url = getPublicJobUrl()
    navigator.clipboard.writeText(url)
    toast.success('Job link copied to clipboard!')
  }

  const copyJobDetails = () => {
    if (!job) return

    const payRange = job.pay_rate_min && job.pay_rate_max 
      ? `£${job.pay_rate_min} - £${job.pay_rate_max} ${job.pay_type === 'hourly' ? 'per hour' : 'per year'}`
      : 'Competitive'

    const text = `
${job.title}

${job.department ? `Department: ${job.department}` : ''}
${job.location ? `Location: ${job.location}` : ''}

Position Type: ${job.boh_foh} ${job.pay_type === 'hourly' ? '(Hourly)' : '(Salaried)'}
Pay: ${payRange}
${job.contract_type ? `Contract: ${job.contract_type}` : ''}
${job.contract_hours ? `Hours: ${job.contract_hours} per week` : ''}

${job.description || ''}

${job.required_skills?.length ? `Required Skills:\n${job.required_skills.join(', ')}` : ''}
${job.required_certifications?.length ? `Required Certifications:\n${job.required_certifications.join(', ')}` : ''}
${job.experience_required ? `Experience: ${job.experience_required}` : ''}

Apply here: ${getPublicJobUrl()}
    `.trim()

    navigator.clipboard.writeText(text)
    toast.success('Job details copied to clipboard!')
  }

  const handlePublishJob = async () => {
    if (!job) return
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          is_published: true,
          status: 'open',
          published_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      
      if (error) throw error
      
      toast.success('Job published successfully!')
      // Reload job data
      loadJob()
    } catch (error: any) {
      console.error('Failed to publish job:', error)
      toast.error('Failed to publish job')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return
    
    setChangingStatus(true)
    try {
      const updates: any = { status: newStatus }
      
      // If changing to closed/filled/archived, unpublish
      if (['filled', 'archived', 'closed'].includes(newStatus)) {
        updates.is_published = false
      }
      
      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', job.id)
      
      if (error) throw error
      
      const statusLabels: Record<string, string> = {
        'draft': 'Draft',
        'open': 'Open',
        'interviewing': 'Interviewing',
        'filled': 'Filled',
        'archived': 'Archived',
        'closed': 'Closed'
      }
      
      toast.success(`Job status changed to ${statusLabels[newStatus]}`)
      loadJob()
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update job status')
    } finally {
      setChangingStatus(false)
    }
  }

  const shareToSocial = (platform: string) => {
    // Only allow sharing if job is published
    if (!job || !job.is_published || job.status !== 'open') {
      toast.error('Please publish the job before sharing. Click "Publish Job" in edit mode.')
      return
    }

    const url = getPublicJobUrl()
    const text = `We're hiring! ${job?.title} - ${job?.location || 'UK'}`
    
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    }
    
    window.open(urls[platform] || url, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-900 dark:text-white/40 animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="text-gray-900 dark:text-white/60 text-center">Job not found</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/people/recruitment"
          className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white/80"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>
          <p className="text-sm text-gray-900 dark:text-white/60 mt-1">
            Posted {new Date(job.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={job.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={changingStatus}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 pr-10 appearance-none cursor-pointer disabled:opacity-50 [&>option]:bg-[#1a1d24] [&>option]:text-gray-900 [&>option]:dark:text-white"
            >
              <option value="draft">📝 Draft</option>
              <option value="open">🟢 Open</option>
              <option value="interviewing">👥 Interviewing</option>
              <option value="filled">✅ Filled</option>
              <option value="archived">📦 Archived</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-900 dark:text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Share Button - only show for open jobs */}
          {job.status === 'open' && (
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}

          {/* Edit Button */}
          <Link
            href={`/dashboard/people/recruitment/jobs/${job.id}/edit`}
            className="px-4 py-2 rounded-lg text-sm bg-transparent text-[#D37E91] border border-blue-600 dark:border-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] transition-all flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Job Overview</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {job.boh_foh}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {job.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {job.department && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-gray-900 dark:text-white/40" />
                  <div>
                    <div className="text-xs text-gray-900 dark:text-white/50">Department</div>
                    <div className="text-gray-900 dark:text-white text-sm">{job.department}</div>
                  </div>
                </div>
              )}

              {job.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-900 dark:text-white/40" />
                  <div>
                    <div className="text-xs text-gray-900 dark:text-white/50">Location</div>
                    <div className="text-gray-900 dark:text-white text-sm">{job.location}</div>
                  </div>
                </div>
              )}

              {(job.pay_rate_min || job.pay_rate_max) && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-gray-900 dark:text-white/40" />
                  <div>
                    <div className="text-xs text-gray-900 dark:text-white/50">Pay Range</div>
                    <div className="text-gray-900 dark:text-white text-sm">
                      {job.pay_rate_min && `£${job.pay_rate_min}`}
                      {job.pay_rate_min && job.pay_rate_max && ' - '}
                      {job.pay_rate_max && `£${job.pay_rate_max}`}
                      {' '}{job.pay_type === 'hourly' ? '/hr' : '/year'}
                    </div>
                  </div>
                </div>
              )}

              {job.contract_hours && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-900 dark:text-white/40" />
                  <div>
                    <div className="text-xs text-gray-900 dark:text-white/50">Contract Hours</div>
                    <div className="text-gray-900 dark:text-white text-sm">{job.contract_hours} hrs/week</div>
                  </div>
                </div>
              )}
            </div>

            {job.description && (
              <div className="pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                <h3 className="text-gray-900 dark:text-white font-medium mb-2">Description</h3>
                <p className="text-gray-900 dark:text-white/70 text-sm whitespace-pre-wrap">{job.description}</p>
              </div>
            )}
          </div>

          {/* Requirements */}
          {(job.required_skills || job.required_certifications || job.experience_required) && (
            <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
              <h2 className="text-gray-900 dark:text-white font-semibold mb-4">Requirements</h2>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-gray-900 dark:text-white/70 text-sm font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/70 border border-gray-300 dark:border-white/10"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.required_certifications && job.required_certifications.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-gray-900 dark:text-white/70 text-sm font-medium mb-2">Required Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.experience_required && (
                <div>
                  <h3 className="text-gray-900 dark:text-white/70 text-sm font-medium mb-2">Experience</h3>
                  <p className="text-gray-900 dark:text-white/70 text-sm">{job.experience_required}</p>
                </div>
              )}
            </div>
          )}

          {/* Applicants (TODO) */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900 dark:text-white font-semibold">
                Applicants ({applicationCount})
              </h2>
              <Link
                href="/dashboard/people/recruitment/candidates"
                className="text-xs text-[#D37E91] hover:underline"
              >
                View all candidates
              </Link>
            </div>
            {applicationCount === 0 ? (
              <div className="text-center py-8 text-gray-900 dark:text-white/40 text-sm">
                No applicants yet. Share this job to start receiving applications.
              </div>
            ) : (
              <div className="text-gray-900 dark:text-white/60 text-sm">
                {applicationCount} {applicationCount === 1 ? 'person has' : 'people have'} applied to this position.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-3 text-sm">Share Job</h3>
            <div className="space-y-2">
              {job.status === 'open' ? (
                <>
                  <button
                    onClick={copyJobUrl}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-transparent text-[#D37E91] border border-blue-600 dark:border-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] transition-all text-left flex items-center gap-2 font-medium"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-left flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Post to Social Media
                  </button>
                </>
              ) : (
                <div className="text-gray-900 dark:text-white/40 text-xs py-2 text-center">
                  Set status to "Open" to share this job
                </div>
              )}
            </div>
          </div>

          {/* Job Insights */}
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-3 text-sm">Job Insights</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-white/50">Total Applications</span>
                <span className="text-gray-900 dark:text-white font-semibold">{applicationCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-white/50">Posted</span>
                <span className="text-gray-900 dark:text-white/70 text-xs">
                  {new Date(job.created_at).toLocaleDateString('en-GB', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              {job.published_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-white/50">Published</span>
                  <span className="text-gray-900 dark:text-white/70 text-xs">
                    {new Date(job.published_at).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#14161c] border border-gray-300 dark:border-white/10 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/[0.06]">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share & Post Job</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Warning if job is not published */}
              {(!job.is_published || job.status !== 'open') && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm font-medium mb-1">Job Not Published</p>
                  <p className="text-yellow-300/70 text-xs">
                    Please publish this job before sharing. The share links will only work for published jobs.
                  </p>
                  <Link
                    href={`/dashboard/people/recruitment/jobs/${job.id}/edit`}
                    className="mt-2 inline-block text-xs text-yellow-400 hover:text-yellow-300 underline"
                  >
                    Go to edit page to publish →
                  </Link>
                </div>
              )}

              {/* Shareable Link */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-3 text-sm">Shareable Link</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={getPublicJobUrl()}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white/70 text-sm font-mono"
                  />
                  <button
                    onClick={copyJobUrl}
                    disabled={!job.is_published || job.status !== 'open'}
                    className="px-4 py-2 rounded-lg bg-transparent text-[#D37E91] border border-blue-600 dark:border-blue-400 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_0_12px_rgba(96,165,250,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-900 dark:text-white/50 mt-2">
                  Share this link on your website, social media, or anywhere else
                </p>
                {(!job.is_published || job.status !== 'open') && (
                  <p className="text-xs text-yellow-400/70 mt-1">
                    ⚠️ Link will not work until job is published
                  </p>
                )}
              </div>

              {/* Social Media */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-3 text-sm">Share on Social Media</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'LinkedIn', key: 'linkedin', icon: '💼', color: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' },
                    { name: 'Twitter/X', key: 'twitter', icon: '🐦', color: 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30' },
                    { name: 'Facebook', key: 'facebook', icon: '📘', color: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30' },
                    { name: 'WhatsApp', key: 'whatsapp', icon: '💬', color: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30' },
                  ].map((social) => {
                    const isDisabled = !job.is_published || job.status !== 'open'
                    return (
                      <button
                        key={social.key}
                        onClick={() => shareToSocial(social.key)}
                        disabled={isDisabled}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${social.color} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-xl">{social.icon}</span>
                        <span className="text-gray-900 dark:text-white text-sm font-medium">{social.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Job Boards */}
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium mb-3 text-sm">Post to Job Boards</h3>
                <p className="text-xs text-gray-900 dark:text-white/60 mb-3">
                  Click to open job board posting pages. Job details will be copied to your clipboard.
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'Indeed', key: 'indeed', icon: '🔵' },
                    { name: 'Caterer.com', key: 'caterer', icon: '👨‍🍳' },
                    { name: 'LinkedIn Jobs', key: 'linkedin', icon: '💼' },
                    { name: 'Total Jobs', key: 'totaljobs', icon: '📋' },
                    { name: 'Reed', key: 'reed', icon: '📰' },
                  ].map((board) => (
                    <a
                      key={board.key}
                      href={getJobBoardUrl(board.key)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={copyJobDetails}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{board.icon}</span>
                        <span className="font-medium text-sm">{board.name}</span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-900 dark:text-white/40" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
