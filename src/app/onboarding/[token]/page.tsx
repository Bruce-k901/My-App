'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, CheckCircle2, Upload, FileText, User, 
  MapPin, Phone, Mail, Calendar, AlertCircle, DollarSign
} from '@/components/ui/icons'
import { toast } from 'sonner'

type OnboardingData = {
  profile: {
    id: string
    full_name: string
    email: string
    phone_number: string | null
    address: string | null
    postcode: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    ni_number: string | null
    date_of_birth: string | null
  }
  assignment: {
    id: string
    pack_id: string | null
    start_date: string | null
  }
  pack: {
    name: string
    description: string | null
  } | null
  documents: Array<{
    id: string
    name: string
    category: string
    notes: string | null
    file_path: string | null
  }>
}

export default function CandidateOnboardingPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<OnboardingData | null>(null)
  
  // Form state - Personal Details
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [nationality, setNationality] = useState('')
  
  // Address
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [postcode, setPostcode] = useState('')
  
  // Compliance
  const [niNumber, setNiNumber] = useState('')
  const [rightToWork, setRightToWork] = useState('')
  const [rightToWorkDocumentType, setRightToWorkDocumentType] = useState('')
  const [rightToWorkDocumentNumber, setRightToWorkDocumentNumber] = useState('')
  const [rightToWorkExpiry, setRightToWorkExpiry] = useState('')
  
  // Banking
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [sortCode, setSortCode] = useState('')
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyEmail, setEmergencyEmail] = useState('')

  const [currentStep, setCurrentStep] = useState(1) // 1: Personal, 2: Documents, 3: Complete

  const load = async () => {
    setLoading(true)
    try {
      // Token is the profile ID for now
      const profileId = token

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (profileError) throw profileError

      // Get onboarding assignment
      let assignment: any = null
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('employee_onboarding_assignments')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 results gracefully

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError)
        throw new Error('Could not load onboarding assignment: ' + assignmentError.message)
      }
      
      assignment = assignmentData
      
      if (!assignment) {
        console.warn('No onboarding assignment found for profile:', profileId)
        console.log('Attempting to create assignment on-the-fly...')
        
        // Try to get company_id from profile
        const companyId = (profile as any).company_id
        
        if (!companyId) {
          throw new Error('No onboarding assignment found and profile has no company_id. Please contact your manager.')
        }
        
        // Try to create a minimal assignment
        const { data: newAssignment, error: createError } = await supabase
          .from('employee_onboarding_assignments')
          .insert({
            profile_id: profileId,
            company_id: companyId,
            sent_at: new Date().toISOString(),
          })
          .select()
          .single()
        
        if (createError || !newAssignment) {
          console.error('Failed to create assignment on-the-fly:', createError)
          throw new Error('No onboarding assignment found. Please contact your manager to set up your onboarding.')
        }
        
        console.log('Created assignment on-the-fly:', newAssignment.id)
        assignment = newAssignment
      }

      // Get pack details
      let pack = null
      if (assignment?.pack_id) {
        const { data: packData } = await supabase
          .from('company_onboarding_packs')
          .select('name, description')
          .eq('id', assignment.pack_id)
          .single()
        pack = packData
      }

      // Get pack documents
      let documents: any[] = []
      if (assignment?.pack_id) {
        const { data: packDocs } = await supabase
          .from('company_onboarding_pack_documents')
          .select(`
            global_documents (
              id,
              name,
              category,
              notes,
              file_path
            )
          `)
          .eq('pack_id', assignment.pack_id)

        documents = packDocs?.map((pd: any) => pd.global_documents).filter(Boolean) || []
      }

      setData({
        profile,
        assignment: assignment || { id: '', pack_id: null, start_date: null },
        pack,
        documents,
      })

      // Determine initial step based on completion status
      // Check if personal details are complete (phone_number and address are good indicators)
      const profileAny = profile as any
      const personalDetailsComplete = profileAny.phone_number && 
                                      profileAny.address_line_1 && 
                                      profileAny.date_of_birth
      
      if (personalDetailsComplete && documents.length === 0) {
        // Personal details complete and no documents - go straight to complete
        setCurrentStep(3)
      } else if (personalDetailsComplete && documents.length > 0) {
        // Personal details complete but documents exist - go to documents step
        setCurrentStep(2)
      } else {
        // Personal details not complete - start at step 1
        setCurrentStep(1)
      }

      // Pre-fill form
      setPhone((profile as any).phone_number || (profile as any).phone || '')
      setDateOfBirth(profile.date_of_birth || '')
      setGender(profile.gender || '')
      setNationality(profile.nationality || '')
      setAddressLine1(profile.address_line_1 || '')
      setAddressLine2(profile.address_line_2 || '')
      setCity(profile.city || '')
      setCounty(profile.county || '')
      setPostcode(profile.postcode || '')
      setNiNumber(profile.national_insurance_number || '')
      setRightToWork(profile.right_to_work_status || '')
      setRightToWorkDocumentType(profile.right_to_work_document_type || '')
      setRightToWorkDocumentNumber((profile as any).right_to_work_document_number || '')
      setRightToWorkExpiry(profile.right_to_work_expiry || '')
      setBankName(profile.bank_name || '')
      setAccountName(profile.bank_account_name || '')
      setAccountNumber(profile.bank_account_number || '')
      setSortCode(profile.bank_sort_code || '')
      
      // Emergency contact (parse from JSONB if exists)
      if (profile.emergency_contacts && Array.isArray(profile.emergency_contacts) && profile.emergency_contacts[0]) {
        const ec = profile.emergency_contacts[0]
        setEmergencyName(ec.name || '')
        setEmergencyRelationship(ec.relationship || '')
        setEmergencyPhone(ec.phone || '')
        setEmergencyEmail(ec.email || '')
      }
    } catch (error: any) {
      console.error('Failed to load onboarding:', error)
      toast.error('Failed to load onboarding data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const markOnboardingComplete = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarded_at: new Date().toISOString(),
        })
        .eq('id', profileId)

      if (error) {
        console.error('Failed to mark onboarding as complete:', error)
        // Don't show error to user - this is a background operation
      } else {
        console.log('Onboarding marked as complete for profile:', profileId)
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error)
    }
  }

  const handleSavePersonalDetails = async () => {
    if (!data) return

    // Validation
    if (!phone.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (!dateOfBirth) {
      toast.error('Date of birth is required')
      return
    }
    if (!addressLine1.trim() || !city.trim() || !postcode.trim()) {
      toast.error('Full address is required')
      return
    }
    if (!niNumber.trim()) {
      toast.error('National Insurance number is required')
      return
    }
    if (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelationship.trim()) {
      toast.error('Emergency contact details are required')
      return
    }
    if (!bankName.trim() || !accountNumber.trim() || !sortCode.trim()) {
      toast.error('Bank details are required for payroll')
      return
    }
    if (!rightToWork) {
      toast.error('Right to work verification is required')
      return
    }
    if (rightToWork === 'pending' && !rightToWorkDocumentType) {
      toast.error('Please select your document type')
      return
    }
    if (rightToWork === 'pending' && !rightToWorkDocumentNumber) {
      toast.error('Please enter your document number or share code')
      return
    }
    if ((rightToWorkDocumentType === 'visa' || rightToWorkDocumentType === 'biometric_residence_permit' || rightToWorkDocumentType === 'share_code') && !rightToWorkExpiry) {
      toast.error('Please enter the expiry date')
      return
    }

    setSaving(true)
    try {
      const emergencyContacts = [{
        name: emergencyName.trim(),
        relationship: emergencyRelationship.trim(),
        phone: emergencyPhone.trim(),
        email: emergencyEmail.trim() || null,
      }]

      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: phone.trim(),
          date_of_birth: dateOfBirth,
          gender: gender || null,
          nationality: nationality.trim() || null,
          address_line_1: addressLine1.trim(),
          address_line_2: addressLine2.trim() || null,
          city: city.trim(),
          county: county.trim() || null,
          postcode: postcode.trim().toUpperCase(),
          national_insurance_number: niNumber.trim().toUpperCase(),
          right_to_work_status: 'pending', // Always pending until manager verifies documents
          right_to_work_document_type: rightToWorkDocumentType || null,
          right_to_work_document_number: rightToWorkDocumentNumber ? rightToWorkDocumentNumber.trim() : null,
          right_to_work_expiry: rightToWorkExpiry || null,
          bank_name: bankName.trim(),
          bank_account_name: accountName.trim() || data.profile.full_name,
          bank_account_number: accountNumber.trim(),
          bank_sort_code: sortCode.trim().replace(/[^0-9]/g, ''), // Remove dashes
          emergency_contacts: emergencyContacts,
        })
        .eq('id', data.profile.id)

      if (error) throw error

      toast.success('Personal details saved!')
      
      // Skip documents step if no documents, otherwise go to documents
      if (data.documents.length === 0) {
        setCurrentStep(3) // Skip to complete
        // Mark onboarding as complete when reaching completion step
        await markOnboardingComplete(data.profile.id)
      } else {
        setCurrentStep(2) // Go to documents
      }
      
      await load()
    } catch (error: any) {
      console.error('Failed to save:', error)
      toast.error('Failed to save details')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Onboarding Not Found</h1>
          <p className="text-white/60">This onboarding link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D37E91]/10 to-transparent border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#D37E91]/10 border-2 border-[#D37E91]/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[#D37E91]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome, {data.profile.full_name}!</h1>
              <p className="text-white/70">Let's get you started with your onboarding</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {(() => {
              // Show 2 steps if no documents, 3 steps if documents exist
              const totalSteps = data.documents.length > 0 ? 3 : 2
              const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
              
              return steps.map((step) => {
                // Map step numbers: if no documents, step 2 becomes "complete"
                const displayStep = data.documents.length === 0 && step === 2 ? 3 : step
                const isActive = displayStep <= currentStep
                
                return (
                  <div key={step} className="flex-1 flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${
                      isActive ? 'bg-[#D37E91]' : 'bg-white/10'
                    }`} />
                    {step < totalSteps && <div className="w-2 h-2 rounded-full bg-white/20" />}
                  </div>
                )
              })
            })()}
          </div>
          <div className={`flex ${data.documents.length > 0 ? 'justify-between' : 'justify-around'} mt-2`}>
            <span className="text-xs text-white/50">Personal Details</span>
            {data.documents.length > 0 && (
              <span className="text-xs text-white/50">Documents</span>
            )}
            <span className="text-xs text-white/50">Complete</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Personal Details</h2>
              <p className="text-white/60 text-sm">
                We need some basic information to set up your profile and payroll.
              </p>
            </div>

            {/* Section 1: Personal Information */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-[#D37E91]" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXX XXXXXX"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Gender (Optional)
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91] [&>option]:bg-[#1a1d24] [&>option]:text-white"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Nationality (Optional)
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="e.g., British, Irish, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                />
              </div>
            </div>

            {/* Section 2: Address */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D37E91]" />
                Home Address
              </h3>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="House number and street name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    City/Town *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="London"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    County (Optional)
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="Greater London"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Postcode *
                  </label>
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="SW1A 1AA"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Employment & Compliance */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D37E91]" />
                Employment & Compliance
              </h3>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  National Insurance Number *
                </label>
                <input
                  type="text"
                  value={niNumber}
                  onChange={(e) => setNiNumber(e.target.value)}
                  placeholder="AB123456C"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] uppercase"
                  maxLength={9}
                />
                <p className="text-xs text-white/40 mt-1">Required for payroll and tax purposes</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Right to Work Status *
                  </label>
                  <select
                    value={rightToWork}
                    onChange={(e) => setRightToWork(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91] [&>option]:bg-[#1a1d24] [&>option]:text-white"
                  >
                    <option value="">Select your right to work status</option>
                    <option value="pending">UK/Irish Citizen or Indefinite Leave</option>
                    <option value="pending">EU Settled/Pre-Settled Status (Share Code)</option>
                    <option value="pending">Visa/Work Permit with Expiry</option>
                    <option value="pending">Biometric Residence Permit (BRP)</option>
                  </select>
                  <p className="text-xs text-white/40 mt-1">
                    You must provide proof of your right to work. Your manager will verify your documents.
                  </p>
                </div>

                {rightToWork && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Document Type *
                      </label>
                      <select
                        value={rightToWorkDocumentType}
                        onChange={(e) => {
                          setRightToWorkDocumentType(e.target.value)
                          // Reset document number when type changes
                          setRightToWorkDocumentNumber('')
                        }}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91] [&>option]:bg-[#1a1d24] [&>option]:text-white"
                      >
                        <option value="">Select document type</option>
                        <option value="passport">UK/Irish Passport</option>
                        <option value="share_code">EU Settlement Share Code</option>
                        <option value="biometric_residence_permit">Biometric Residence Permit (BRP)</option>
                        <option value="visa">Visa</option>
                        <option value="other">Other Official Document</option>
                      </select>
                    </div>

                    {rightToWorkDocumentType && (
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          {rightToWorkDocumentType === 'share_code' ? 'Share Code *' : rightToWorkDocumentType === 'passport' ? 'Passport Number *' : 'Document Number/Reference *'}
                        </label>
                        <input
                          type="text"
                          value={rightToWorkDocumentNumber}
                          onChange={(e) => setRightToWorkDocumentNumber(e.target.value.toUpperCase())}
                          placeholder={
                            rightToWorkDocumentType === 'share_code' 
                              ? 'Enter your 9-character share code'
                              : rightToWorkDocumentType === 'passport'
                              ? 'Enter passport number'
                              : 'Enter document number or reference'
                          }
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-[#D37E91]"
                        />
                        {rightToWorkDocumentType === 'share_code' && (
                          <p className="text-xs text-white/40 mt-1">
                            Get your share code from <a href="https://www.gov.uk/view-prove-immigration-status" target="_blank" rel="noopener noreferrer" className="text-[#D37E91] underline">gov.uk/view-prove-immigration-status</a>
                          </p>
                        )}
                      </div>
                    )}

                    {(rightToWorkDocumentType === 'visa' || rightToWorkDocumentType === 'biometric_residence_permit' || rightToWorkDocumentType === 'share_code') && (
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="date"
                          value={rightToWorkExpiry}
                          onChange={(e) => setRightToWorkExpiry(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D37E91]"
                        />
                        <p className="text-xs text-white/40 mt-1">
                          {rightToWorkDocumentType === 'share_code' 
                            ? 'Your settled/pre-settled status expiry date'
                            : 'When your visa/BRP expires'}
                        </p>
                      </div>
                    )}

                    {rightToWorkDocumentType === 'passport' && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-200/80">
                        ✓ UK/Irish passports don't expire for right to work purposes. Please bring your passport on your first day for verification.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Bank Details */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D37E91]" />
                Bank Details (for payroll)
              </h3>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200/80">
                🔒 Your bank details are encrypted and securely stored. They're only used for paying your wages.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Barclays, HSBC, Lloyds"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Account Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name on account"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                  <p className="text-xs text-white/40 mt-1">Defaults to your full name if blank</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="12345678"
                    maxLength={8}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Sort Code *
                  </label>
                  <input
                    type="text"
                    value={sortCode}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9]/g, '')
                      if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2)
                      if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5, 7)
                      setSortCode(value)
                    }}
                    placeholder="12-34-56"
                    maxLength={8}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#D37E91]" />
                Emergency Contact
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    value={emergencyRelationship}
                    onChange={(e) => setEmergencyRelationship(e.target.value)}
                    placeholder="e.g., Partner, Parent, Sibling"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="07XXX XXXXXX"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={emergencyEmail}
                    onChange={(e) => setEmergencyEmail(e.target.value)}
                    placeholder="contact@email.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#D37E91]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSavePersonalDetails}
                disabled={saving}
                className="px-8 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Documents
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Documents */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Review & Acknowledge Documents</h2>
              <p className="text-white/60 text-sm">
                Please review these documents and confirm you've read and understood them.
              </p>
            </div>

            {data.documents.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No Documents Required</h3>
                <p className="text-white/60 mb-4">
                  There are no documents assigned to your onboarding pack at this time.
                </p>
                <p className="text-white/50 text-sm">
                  You can continue to complete your onboarding. Your manager may add documents later if needed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-[#D37E91]" />
                          <div>
                            <h3 className="text-white font-medium">{doc.name}</h3>
                            <p className="text-xs text-white/50">{doc.category}</p>
                          </div>
                        </div>
                        {doc.notes && (
                          <p className="text-sm text-white/60 ml-8">{doc.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.file_path && (
                          <button
                            onClick={async () => {
                              try {
                                const { data: signedUrl } = await supabase.storage
                                  .from('global_docs')
                                  .createSignedUrl(doc.file_path!, 60)
                                
                                if (signedUrl) {
                                  window.open(signedUrl.signedUrl, '_blank')
                                }
                              } catch (error) {
                                toast.error('Failed to open document')
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                          >
                            View
                          </button>
                        )}
                        <button
                          className="px-4 py-1.5 rounded-lg text-sm bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all"
                        >
                          ✓ Acknowledge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.documents.length > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-200/80 text-sm">
                  💡 <strong>Note:</strong> After acknowledging these documents, you'll complete your onboarding.
                  Your manager may request additional document uploads (ID, certificates) separately if needed.
                </p>
              </div>
            )}
            
            {data.documents.length === 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-200/80 text-sm">
                  ✓ <strong>All set!</strong> No documents to review. Click continue to complete your onboarding.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 rounded-lg text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={async () => {
                  setCurrentStep(3)
                  toast.success('Documents acknowledged!')
                  // Mark onboarding as complete when reaching completion step
                  if (data) {
                    await markOnboardingComplete(data.profile.id)
                  }
                }}
                className="px-8 py-3 rounded-lg bg-transparent text-[#D37E91] border-2 border-[#D37E91] hover:shadow-[0_0_20px_rgba(211, 126, 145,0.7)] transition-all font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Onboarding In Progress!
              </h2>
              <p className="text-white/70 text-lg mb-8">
                Thank you for completing the initial steps.
              </p>

              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 max-w-2xl mx-auto text-left">
                <h3 className="text-white font-semibold mb-4">What happens next?</h3>
                <ul className="space-y-3 text-white/70 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-[#D37E91] mt-1">•</span>
                    <span>Your manager will review your information</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#D37E91] mt-1">•</span>
                    <span>When you come in for your first shift, please bring:</span>
                  </li>
                  <ul className="ml-8 space-y-2 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">→</span>
                      <span>Photo ID (passport or driving licence)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">→</span>
                      <span>Proof of National Insurance number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">→</span>
                      <span>Proof of address (utility bill or bank statement)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/40">→</span>
                      <span>Any relevant certificates (if applicable)</span>
                    </li>
                  </ul>
                  <li className="flex items-start gap-3">
                    <span className="text-[#D37E91] mt-1">•</span>
                    <span>Your start date: <strong>{data.assignment.start_date ? new Date(data.assignment.start_date).toLocaleDateString('en-GB') : 'To be confirmed'}</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#D37E91] mt-1">•</span>
                    <span>You'll receive your employee number and login details before your first shift</span>
                  </li>
                </ul>
              </div>

              {data.pack && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 max-w-2xl mx-auto text-left mt-6">
                  <h3 className="text-white font-semibold mb-2">Your Onboarding Pack</h3>
                  <p className="text-white/70 text-sm">{data.pack.name}</p>
                  {data.pack.description && (
                    <p className="text-white/50 text-xs mt-2">{data.pack.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
