'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Select from '@/components/ui/Select'

export default function PostJobPage() {
  const router = useRouter()
  const { profile } = useAppContext()
  const companyId = profile?.company_id

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  
  // Critical fields
  const [bohFoh, setBohFoh] = useState<'FOH' | 'BOH' | 'BOTH'>('FOH')
  const [payType, setPayType] = useState<'hourly' | 'salaried'>('hourly')
  
  // Pay & contract
  const [payRateMin, setPayRateMin] = useState('')
  const [payRateMax, setPayRateMax] = useState('')
  const [contractType, setContractType] = useState<'permanent' | 'fixed_term' | 'zero_hours' | 'casual'>('permanent')
  const [contractHours, setContractHours] = useState('')
  
  // Requirements
  const [requiredSkills, setRequiredSkills] = useState('')
  const [requiredCerts, setRequiredCerts] = useState('')
  const [experienceRequired, setExperienceRequired] = useState('')

  const handleSave = async (publish: boolean) => {
    if (!companyId) {
      toast.error('Missing company context')
      return
    }

    if (!title.trim()) {
      toast.error('Job title is required')
      return
    }

    const setLoading = publish ? setPublishing : setSaving
    setLoading(true)

    try {
      const jobData = {
        company_id: companyId,
        title: title.trim(),
        department: department.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        boh_foh: bohFoh,
        pay_type: payType,
        pay_rate_min: payRateMin ? parseFloat(payRateMin) : null,
        pay_rate_max: payRateMax ? parseFloat(payRateMax) : null,
        contract_type: contractType,
        contract_hours: contractHours ? parseFloat(contractHours) : null,
        required_skills: requiredSkills ? requiredSkills.split(',').map((s) => s.trim()) : null,
        required_certifications: requiredCerts ? requiredCerts.split(',').map((c) => c.trim()) : null,
        experience_required: experienceRequired.trim() || null,
        status: publish ? 'open' : 'draft',
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        created_by: profile?.id,
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single()

      if (error) throw error

      toast.success(publish ? 'Job published!' : 'Job saved as draft')
      router.push(`/dashboard/people/recruitment`)
    } catch (error: any) {
      console.error('Failed to save job:', error)
      toast.error(`Failed to save job: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/people/recruitment"
          className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white/80"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Post New Job</h1>
          <p className="text-sm text-gray-900 dark:text-white/60 mt-1">
            Create a new job posting to start hiring
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 space-y-6">
        {/* Job Details */}
        <div className="space-y-4">
          <h2 className="text-gray-900 dark:text-white font-semibold">Job Details</h2>

          <div>
            <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Server, Chef, Bartender"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Kitchen, Bar, Front of House"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., London Bridge, Multiple sites"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Job Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              rows={6}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
        </div>

        {/* Position Type (CRITICAL) */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold mb-1">Position Type</h2>
            <p className="text-xs text-gray-900 dark:text-white/40">
              These determine which onboarding pack is auto-assigned
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BOH/FOH */}
            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-2">Work Area *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['FOH', 'BOH', 'BOTH'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setBohFoh(option)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      bohFoh === option
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/60 border-2 border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-900 dark:text-white/30 mt-1">
                {bohFoh === 'FOH' && 'Front of House (servers, hosts, bar staff)'}
                {bohFoh === 'BOH' && 'Back of House (chefs, kitchen staff)'}
                {bohFoh === 'BOTH' && 'Flexible across all areas'}
              </p>
            </div>

            {/* Hourly/Salaried */}
            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-2">Pay Structure *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['hourly', 'salaried'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setPayType(option)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      payType === option
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white/60 border-2 border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {option === 'hourly' ? 'Hourly' : 'Salaried'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pay & Contract */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-gray-900 dark:text-white font-semibold">Pay & Contract</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">
                Min Pay Rate (£{payType === 'hourly' ? '/hour' : '/year'})
              </label>
              <input
                type="number"
                step="0.01"
                value={payRateMin}
                onChange={(e) => setPayRateMin(e.target.value)}
                placeholder={payType === 'hourly' ? '11.50' : '25000'}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">
                Max Pay Rate (£{payType === 'hourly' ? '/hour' : '/year'})
              </label>
              <input
                type="number"
                step="0.01"
                value={payRateMax}
                onChange={(e) => setPayRateMax(e.target.value)}
                placeholder={payType === 'hourly' ? '15.00' : '35000'}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Contract Type</label>
              <Select
                value={contractType}
                onValueChange={(v) => setContractType(v as any)}
                options={[
                  { label: 'Permanent', value: 'permanent' },
                  { label: 'Fixed Term', value: 'fixed_term' },
                  { label: 'Zero Hours', value: 'zero_hours' },
                  { label: 'Casual', value: 'casual' },
                ]}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">
                Contract Hours (per week)
              </label>
              <input
                type="number"
                step="0.5"
                value={contractHours}
                onChange={(e) => setContractHours(e.target.value)}
                placeholder="e.g., 40, 20, 16"
                className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <h2 className="text-gray-900 dark:text-white font-semibold">Requirements</h2>

          <div>
            <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">
              Required Skills (comma-separated)
            </label>
            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g., Customer service, Cash handling, Teamwork"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">
              Required Certifications (comma-separated)
            </label>
            <input
              type="text"
              value={requiredCerts}
              onChange={(e) => setRequiredCerts(e.target.value)}
              placeholder="e.g., Food Hygiene Level 2, Personal License"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-900 dark:text-white/50 block mb-1">Experience Required</label>
            <input
              type="text"
              value={experienceRequired}
              onChange={(e) => setExperienceRequired(e.target.value)}
              placeholder="e.g., 1-2 years, No experience needed, Previous chef experience"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <Link
            href="/dashboard/people/recruitment"
            className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white/80"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || publishing || !title.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Draft
                </>
              )}
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={saving || publishing || !title.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-transparent text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Job
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
