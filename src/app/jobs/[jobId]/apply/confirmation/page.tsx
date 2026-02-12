'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Loader2, Mail, Calendar, Briefcase, Building2 } from '@/components/ui/icons'
import Link from 'next/link'

type Application = {
  id: string
  applied_at: string
  jobs: {
    id: string
    title: string
    department: string | null
    companies: {
      name: string
    } | null
  } | null
  candidates: {
    full_name: string
    email: string
  } | null
}

export default function ApplicationConfirmationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const jobIdOrSlug = params.jobId as string
  const applicationId = searchParams.get('applicationId')

  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState<Application | null>(null)

  const load = async () => {
    if (!applicationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch without companies join (workaround for RLS)
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          applied_at,
          jobs!applications_job_id_fkey (
            id,
            title,
            department,
            company_id
          ),
          candidates!applications_candidate_id_fkey (
            full_name,
            email
          )
        `)
        .eq('id', applicationId)
        .single()

      if (error) {
        console.error('Application query error:', error)
        throw error
      }
      
      // Try to fetch company separately
      if (data?.jobs?.company_id) {
        try {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', (data.jobs as any).company_id)
            .single()
          
          if (companyData) {
            (data.jobs as any).companies = companyData
          }
        } catch (companyError) {
          // Silently fail - company name is optional
          console.log('Could not fetch company name')
        }
      }
      
      setApplication(data as any)
    } catch (error: any) {
      console.error('Failed to load application:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [applicationId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    )
  }

  if (!application || !application.jobs) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-theme-primary mb-2">Application Not Found</h1>
          <p className="text-theme-tertiary">We couldn't find your application details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-theme-primary mb-3">
            Application Submitted!
          </h1>
          <p className="text-theme-secondary text-lg">
            Thank you for applying, {application.candidates?.full_name}
          </p>
        </div>

        {/* Application Details */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Application Details</h2>
            
            <div className="space-y-4">
              {application.jobs.companies?.name && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-theme-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-theme-tertiary">Company</div>
                    <div className="text-theme-primary font-medium">{application.jobs.companies.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-theme-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-theme-tertiary">Position</div>
                  <div className="text-theme-primary font-medium">{application.jobs.title}</div>
                  {application.jobs.department && (
                    <div className="text-theme-tertiary text-sm">{application.jobs.department}</div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-theme-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-theme-tertiary">Email Confirmation Sent To</div>
                  <div className="text-theme-primary font-medium">{application.candidates?.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-theme-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-theme-tertiary">Submitted On</div>
                  <div className="text-theme-primary font-medium">
                    {new Date(application.applied_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <h3 className="text-theme-primary font-semibold mb-3">What happens next?</h3>
            <ul className="space-y-2 text-theme-secondary text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#D37E91] mt-1">•</span>
                <span>You'll receive a confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D37E91] mt-1">•</span>
                <span>Our hiring team will review your application</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D37E91] mt-1">•</span>
                <span>If shortlisted, we'll contact you to arrange an interview</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D37E91] mt-1">•</span>
                <span>You should hear back from us within 5-7 working days</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-white/[0.06] text-center">
            <p className="text-theme-tertiary text-sm mb-4">
              Good luck with your application!
            </p>
            <Link
              href={`/jobs/${jobIdOrSlug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all"
            >
              Back to Job Listing
            </Link>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-200/80 text-sm text-center">
            💡 <strong>Application Reference:</strong> {application.id.slice(0, 8).toUpperCase()}
            <br />
            <span className="text-xs text-blue-200/60 mt-1 block">
              Keep this reference number for your records
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
