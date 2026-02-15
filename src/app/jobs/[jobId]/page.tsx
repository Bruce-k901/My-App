'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, MapPin, DollarSign, Briefcase, Calendar, 
  Clock, CheckCircle2, Building2
} from '@/components/ui/icons'
import Link from 'next/link'

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
  is_published: boolean
  published_at: string | null
  company_id: string
  companies: {
    name: string
  } | null
}

export default function PublicJobPage() {
  const params = useParams()
  const jobIdOrSlug = params.jobId as string

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<Job | null>(null)

  // Extract actual job ID from slug or return UUID as-is
  const extractJobIdPattern = (slugOrId: string): { isUUID: boolean; searchValue: string } => {
    // Check if it's a full UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(slugOrId)) {
      return { isUUID: true, searchValue: slugOrId }
    }
    
    // Extract short ID from slug (last segment after last hyphen)
    const parts = slugOrId.split('-')
    const shortId = parts[parts.length - 1]
    return { isUUID: false, searchValue: shortId }
  }

  const load = async () => {
    setLoading(true)
    try {
      const { isUUID, searchValue } = extractJobIdPattern(jobIdOrSlug)
      
      // Fetch job without companies join (workaround for RLS issue)
      let query = supabase
        .from('jobs')
        .select(`
          id,
          title,
          description,
          department,
          location,
          boh_foh,
          pay_type,
          pay_rate_min,
          pay_rate_max,
          contract_type,
          contract_hours,
          required_skills,
          required_certifications,
          experience_required,
          is_published,
          company_id
        `)
        .eq('is_published', true)
        .eq('status', 'open')
      
      // Search by full UUID or by last segment
      let data, error
      if (isUUID) {
        const result = await query.eq('id', searchValue).single()
        data = result.data
        error = result.error
      } else {
        // For slug format, fetch all open jobs and filter in JS (UUID LIKE doesn't work)
        const { data: allJobs, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            description,
            department,
            location,
            boh_foh,
            pay_type,
            pay_rate_min,
            pay_rate_max,
            contract_type,
            contract_hours,
            required_skills,
            required_certifications,
            experience_required,
            is_published,
            company_id
          `)
          .eq('is_published', true)
          .eq('status', 'open')
        
        if (fetchError) {
          error = fetchError
          data = null
        } else {
          // Find job where ID ends with our search value
          const matchedJob = allJobs?.find(j => j.id.endsWith(searchValue))
          data = matchedJob || null
          error = matchedJob ? null : { message: 'Job not found' }
        }
      }
      
      // Try to fetch company separately (silently fail if RLS blocks it)
      if (data && data.company_id) {
        try {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', data.company_id)
            .single()
          
          if (companyData) {
            (data as any).companies = companyData
          }
        } catch (companyError) {
          // Silently fail - company name is optional
          console.log('Could not fetch company name (RLS issue)')
        }
      }

      if (error) {
        console.error('Job query error:', error)
        throw error
      }
      
      console.log('Job data loaded:', data)
      setJob(data as any)
    } catch (error: any) {
      console.error('Failed to load job:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [jobIdOrSlug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-theme-primary mb-2">Job Not Found</h1>
          <p className="text-theme-tertiary">This job posting is no longer available.</p>
        </div>
      </div>
    )
  }

  const payRange = job.pay_rate_min && job.pay_rate_max 
    ? `£${job.pay_rate_min} - £${job.pay_rate_max} ${job.pay_type === 'hourly' ? 'per hour' : 'per year'}`
    : 'Competitive salary'

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D37E91]/10 to-transparent border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {job.companies?.name && (
                  <div className="flex items-center gap-2 text-theme-tertiary text-sm">
                    <Building2 className="w-4 h-4" />
                    <span>{job.companies.name}</span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-bold text-theme-primary mb-4">{job.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3">
                {job.location && (
                  <div className="flex items-center gap-2 text-theme-secondary text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.department && (
                  <div className="flex items-center gap-2 text-theme-secondary text-sm">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-theme-secondary text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span>{payRange}</span>
                </div>
                {job.contract_hours && (
                  <div className="flex items-center gap-2 text-theme-secondary text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{job.contract_hours} hrs/week</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <span className="px-3 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {job.boh_foh}
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {job.pay_type === 'hourly' ? 'Hourly' : 'Salaried'}
                </span>
                {job.contract_type && (
                  <span className="px-3 py-1 text-xs rounded-full bg-white/5 text-theme-secondary border border-white/10">
                    {job.contract_type}
                  </span>
                )}
              </div>
            </div>

            <Link
              href={`/jobs/${jobIdOrSlug}/apply`}
              className="px-6 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all font-semibold whitespace-nowrap"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Description */}
        {job.description && (
          <div>
            <h2 className="text-xl font-semibold text-theme-primary mb-4">About the Role</h2>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              <p className="text-theme-secondary whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          </div>
        )}

        {/* Requirements */}
        {(job.required_skills || job.required_certifications || job.experience_required) && (
          <div>
            <h2 className="text-xl font-semibold text-theme-primary mb-4">Requirements</h2>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-6">
              {job.required_skills && job.required_skills.length > 0 && (
                <div>
                  <h3 className="text-theme-primary font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#D37E91]" />
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-theme-secondary border border-white/10"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.required_certifications && job.required_certifications.length > 0 && (
                <div>
                  <h3 className="text-theme-primary font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#D37E91]" />
                    Required Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-500/10 text-green-400 border border-green-500/30"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.experience_required && (
                <div>
                  <h3 className="text-theme-primary font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#D37E91]" />
                    Experience Required
                  </h3>
                  <p className="text-theme-secondary">{job.experience_required}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Apply CTA */}
        <div className="bg-gradient-to-r from-[#D37E91]/10 to-purple-500/10 border border-white/[0.06] rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-theme-primary mb-2">Ready to Apply?</h3>
          <p className="text-theme-tertiary mb-6">Join our team and start your career with us today.</p>
          <Link
            href={`/jobs/${jobIdOrSlug}/apply`}
            className="inline-block px-8 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all font-semibold"
          >
            Apply Now
          </Link>
        </div>
      </div>

    </div>
  )
}
