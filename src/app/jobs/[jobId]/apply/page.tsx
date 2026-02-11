'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, ArrowLeft, Upload, CheckCircle2, AlertCircle,
  Briefcase, MapPin, DollarSign, Building2
} from '@/components/ui/icons'
import Link from 'next/link'
import { toast } from 'sonner'

type Job = {
  id: string
  title: string
  department: string | null
  location: string | null
  boh_foh: 'FOH' | 'BOH' | 'BOTH'
  pay_type: 'hourly' | 'salaried'
  pay_rate_min: number | null
  pay_rate_max: number | null
  is_published: boolean
  company_id: string
  companies: {
    name: string
  } | null
}

export default function ApplyPage() {
  const params = useParams()
  const router = useRouter()
  const jobIdOrSlug = params.jobId as string
  
  // Extract actual job ID from slug or return UUID as-is
  const extractJobIdPattern = (slugOrId: string): { isUUID: boolean; searchValue: string } => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(slugOrId)) {
      return { isUUID: true, searchValue: slugOrId }
    }
    const parts = slugOrId.split('-')
    const shortId = parts[parts.length - 1]
    return { isUUID: false, searchValue: shortId }
  }

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<Job | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [source, setSource] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { isUUID, searchValue } = extractJobIdPattern(jobIdOrSlug)
      
      // Fetch job without companies join (workaround for RLS)
      let query = supabase
        .from('jobs')
        .select(`
          id,
          title,
          department,
          location,
          boh_foh,
          pay_type,
          pay_rate_min,
          pay_rate_max,
          is_published,
          company_id
        `)
        .eq('is_published', true)
        .eq('status', 'open')
      
      let data, error
      if (isUUID) {
        const result = await query.eq('id', searchValue).single()
        data = result.data
        error = result.error
      } else {
        // For slug format, fetch and filter in JS (UUID LIKE doesn't work in PostgREST)
        const { data: allJobs, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            department,
            location,
            boh_foh,
            pay_type,
            pay_rate_min,
            pay_rate_max,
            is_published,
            company_id
          `)
          .eq('is_published', true)
          .eq('status', 'open')
        
        if (fetchError) {
          error = fetchError
          data = null
        } else {
          const matchedJob = allJobs?.find(j => j.id.endsWith(searchValue))
          data = matchedJob || null
          error = matchedJob ? null : new Error('Job not found')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!job) return

    // Validation
    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number')
      return
    }
    if (!cvFile) {
      toast.error('Please upload your CV')
      return
    }

    setSubmitting(true)
    try {
      // Call API to create candidate and application
      const response = await fetch('/api/recruitment/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          companyId: job.company_id,
          fullName,
          email,
          phone,
          coverLetter,
          source: source || 'Direct Application',
          cvFileName: cvFile.name,
          cvFileType: cvFile.type,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      // Upload CV to storage using the candidate ID
      const { candidateId, applicationId } = result
      
      // Convert file to base64 for API upload (since anonymous users can't upload directly)
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(cvFile)
      })

      // Upload via API (which uses service role)
      const uploadResponse = await fetch('/api/recruitment/upload-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          companyId: job.company_id,
          fileName: cvFile.name,
          fileData,
          fileType: cvFile.type,
        }),
      })

      const uploadResult = await uploadResponse.json()
      
      if (!uploadResponse.ok || uploadResult.error) {
        console.error('CV upload failed:', uploadResult.error)
        toast.warning('Application submitted, but CV upload had issues. The hiring team has been notified.')
      } else {
        console.log('CV uploaded successfully:', uploadResult.cvPath)
      }

      // Success!
      toast.success('Application submitted successfully!')
      
      // Small delay to show the toast before redirecting
      setTimeout(() => {
        router.push(`/jobs/${jobIdOrSlug}/apply/confirmation?applicationId=${applicationId}`)
      }, 500)
    } catch (error: any) {
      console.error('Application error:', error)
      toast.error(error.message || 'Failed to submit application')
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setCvFile(file)
  }

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
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Available</h1>
          <p className="text-white/60 mb-6">
            This job posting is no longer accepting applications.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all"
          >
            Go Back
          </Link>
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
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link
            href={`/jobs/${jobIdOrSlug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to job details
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              {job.companies?.name && (
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>{job.companies.name}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-white mb-3">Apply for {job.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {job.location && (
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.department && (
                  <div className="flex items-center gap-2 text-white/70">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-white/70">
                  <DollarSign className="w-4 h-4" />
                  <span>{payRange}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXX XXXXXX"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  How did you hear about this job? (Optional)
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91] transition-colors [&>option]:bg-[#1a1d24] [&>option]:text-white"
                >
                  <option value="">Select a source</option>
                  <option value="Indeed">Indeed</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Caterer.com">Caterer.com</option>
                  <option value="Total Jobs">Total Jobs</option>
                  <option value="Reed">Reed</option>
                  <option value="Company Website">Company Website</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Referral">Referral</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* CV Upload */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Your CV *</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-3">
                  Upload your CV
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cv-upload"
                  />
                  <label
                    htmlFor="cv-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-lg hover:border-[#D37E91]/50 transition-colors cursor-pointer group"
                  >
                    {cvFile ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-white font-medium">{cvFile.name}</p>
                        <p className="text-white/50 text-xs mt-1">
                          {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-white/40 group-hover:text-[#D37E91] mx-auto mb-2 transition-colors" />
                        <p className="text-white/70 font-medium">Click to upload your CV</p>
                        <p className="text-white/40 text-xs mt-1">
                          PDF, DOC, DOCX (Max 5MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Cover Letter (Optional)</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Tell us why you're a great fit for this role
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={8}
                placeholder="Share your experience, skills, and why you're interested in this position..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Link
              href={`/jobs/${jobIdOrSlug}`}
              className="px-6 py-3 rounded-lg text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
