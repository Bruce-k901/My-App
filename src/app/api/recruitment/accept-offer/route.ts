import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Calculate probation end date (3 months from start date)
 */
function calculateProbationEndDate(startDate: string): string {
  const start = new Date(startDate)
  const probationEnd = new Date(start)
  probationEnd.setMonth(probationEnd.getMonth() + 3)
  // Return as YYYY-MM-DD format
  return probationEnd.toISOString().split('T')[0]
}

/**
 * Generate next employee number for a company
 */
async function generateNextEmployeeNumber(companyId: string, companyName: string): Promise<string | null> {
  try {
    if (!companyId || !companyName) {
      console.error('generateNextEmployeeNumber: Missing companyId or companyName', { companyId, companyName })
      return null
    }
    
    // Get first 3 letters of company name (uppercase, remove spaces/special chars)
    const companyPrefix = companyName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase()
    
    if (!companyPrefix || companyPrefix.length < 3) {
      console.warn('Company name too short for prefix:', companyName, '->', companyPrefix)
      return null
    }
    
    const prefix = `${companyPrefix}EMP`
    console.log('Generating employee number with prefix:', prefix, 'for company:', companyId)
    
    // Get all existing employee numbers with this prefix
    const { data: existingEmployees, error } = await supabase
      .from('profiles')
      .select('employee_number')
      .eq('company_id', companyId)
      .not('employee_number', 'is', null)
      .like('employee_number', `${prefix}%`)
    
    if (error) {
      console.error('Error fetching existing employee numbers:', error)
      return null
    }
    
    console.log('Found existing employees with prefix:', existingEmployees?.length || 0)
    
    // Extract numbers and find the highest
    let maxNumber = 0
    if (existingEmployees && existingEmployees.length > 0) {
      existingEmployees.forEach((emp: any) => {
        const match = emp.employee_number?.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxNumber) maxNumber = num
        }
      })
    }
    
    // Generate next number (padded to 3 digits)
    const nextNumber = maxNumber + 1
    const generatedNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`
    console.log('Generated employee number:', generatedNumber, '(next after', maxNumber, ')')
    return generatedNumber
  } catch (err) {
    console.error('Error generating employee number:', err)
    return null
  }
}

/**
 * Accept Offer API Route
 * 
 * Handles offer acceptance by:
 * 1. Validating the offer token
 * 2. Creating or updating user profile (using phone_number, not phone)
 * 3. Creating onboarding assignment (if table exists)
 * 4. Updating offer, application, and candidate status
 * 
 * Note: This route is defensive and handles missing columns/tables gracefully
 */

export async function POST(request: NextRequest) {
  try {
    const { token, signature } = await request.json()

    if (!token || !signature) {
      return NextResponse.json(
        { error: 'Token and signature are required' },
        { status: 400 }
      )
    }

    // 1. Get the offer
    const { data: offer, error: offerError } = await supabase
      .from('offer_letters')
      .select(`
        *,
        candidate:candidates(*),
        job:jobs(*),
        application:applications(*)
      `)
      .eq('offer_token', token)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    // Check if already accepted
    if (offer.status === 'accepted') {
      return NextResponse.json(
        { error: 'Offer already accepted' },
        { status: 400 }
      )
    }

    // Check if expired
    if (new Date(offer.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Offer has expired' },
        { status: 400 }
      )
    }

    // 2. Get company name for employee number generation (needed for both paths)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', offer.company_id)
      .single()
    
    if (companyError || !company) {
      console.error('Company not found for company_id:', offer.company_id, companyError)
      // Continue anyway - employee number generation will fail gracefully
    } else {
      console.log('Company found for employee number generation:', company.name)
    }

    // 3. Check if profile already exists for this email (email has unique constraint)
    // Check for any profile with this email, regardless of company_id
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, company_id, full_name, phone_number, employee_number')
      .eq('email', offer.candidate.email.toLowerCase())

    if (checkError) {
      console.error('Error checking for existing profile:', checkError)
      // Continue to try creating - might be a transient error
    }

    let profile: any

    if (existingProfiles && existingProfiles.length > 0) {
      // Profile already exists with this email
      // Use the first one (should only be one due to unique constraint)
      profile = existingProfiles[0]
      console.log('Using existing profile:', profile.id, profile.full_name, 'Company:', profile.company_id)
      
      // Generate employee number if not already set
      let employeeNumber = profile.employee_number
      if (!employeeNumber && company?.name) {
        employeeNumber = await generateNextEmployeeNumber(offer.company_id, company.name)
        if (employeeNumber) {
          console.log('Generated employee number:', employeeNumber)
        }
      }
      
      // Update the profile with latest candidate info and company_id
      const updateData: any = {
        full_name: offer.candidate.full_name,
      }
      
      // Update company_id if it's different or null
      if (profile.company_id !== offer.company_id) {
        updateData.company_id = offer.company_id
        console.log(`Updating profile company_id from ${profile.company_id} to ${offer.company_id}`)
      }
      
      // Update phone_number if provided (check if candidate has phone field)
      if (offer.candidate.phone_number || (offer.candidate as any).phone) {
        updateData.phone_number = offer.candidate.phone_number || (offer.candidate as any).phone
      }
      
      // Add employee number if generated
      if (employeeNumber) {
        updateData.employee_number = employeeNumber
      }
      
      // Add start date from offer (always set if available)
      if (offer.start_date) {
        updateData.start_date = offer.start_date
        console.log('Setting start_date from offer:', offer.start_date)
      } else {
        console.warn('Offer does not have start_date set')
      }
      
      // Add contracted hours from offer (contract_hours) - ALWAYS use offer value
      // Convert to numeric if it's a string or number
      if (offer.contract_hours !== null && offer.contract_hours !== undefined) {
        const hours = typeof offer.contract_hours === 'string' 
          ? parseFloat(offer.contract_hours) 
          : offer.contract_hours
        if (!isNaN(hours) && hours > 0) {
          updateData.contracted_hours_per_week = hours
          console.log('Setting contracted_hours_per_week from offer (overriding existing):', hours, '(was:', profile.contracted_hours_per_week || 'not set', ')')
        } else {
          console.warn('Offer contract_hours is invalid:', offer.contract_hours)
        }
      } else {
        console.warn('Offer does not have contract_hours set')
      }
      
      // Add hourly rate from offer (pay_rate) - only if pay_frequency is 'hourly'
      // Note: hourly_rate is stored in pence (multiply by 100), pay_rate is in pounds
      if (offer.pay_frequency === 'hourly' && offer.pay_rate !== null && offer.pay_rate !== undefined) {
        const rateInPounds = typeof offer.pay_rate === 'string' 
          ? parseFloat(offer.pay_rate) 
          : offer.pay_rate
        if (!isNaN(rateInPounds) && rateInPounds > 0) {
          // Convert pounds to pence (multiply by 100)
          updateData.hourly_rate = Math.round(rateInPounds * 100)
          console.log('Setting hourly_rate from offer (overriding existing):', rateInPounds, 'pounds =', updateData.hourly_rate, 'pence', '(was:', profile.hourly_rate ? (profile.hourly_rate / 100) + ' pounds' : 'not set', ')')
        } else {
          console.warn('Offer pay_rate is invalid for hourly rate:', offer.pay_rate)
        }
      } else if (offer.pay_frequency === 'hourly') {
        console.warn('Offer pay_frequency is hourly but pay_rate is missing')
      }
      
      // Add optional columns if they exist in the schema
      if (offer.position_title) {
        updateData.position_title = offer.position_title
      }
      
      // Add BOH/FOH from offer
      if (offer.boh_foh) {
        updateData.boh_foh = offer.boh_foh
      }
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
      
      if (updateError) {
        console.warn('Could not update existing profile:', updateError)
        // Continue anyway - profile exists and we can use it
      } else {
        console.log('Successfully updated existing profile')
      }
    } else {
      // No profile exists - create new one
      console.log('No existing profile found, creating new profile for:', offer.candidate.email)
      
      // Generate employee number (company already fetched above)
      const employeeNumber = company?.name 
        ? await generateNextEmployeeNumber(offer.company_id, company.name)
        : null
      
      if (employeeNumber) {
        console.log('Generated employee number for new profile:', employeeNumber)
      }
      
      const profileData: any = {
        email: offer.candidate.email.toLowerCase(),
        full_name: offer.candidate.full_name,
        company_id: offer.company_id,
        app_role: 'Staff',
      }
      
      // Add employee number if generated
      if (employeeNumber) {
        profileData.employee_number = employeeNumber
      }
      
      // Add start date from offer (always set if available)
      if (offer.start_date) {
        profileData.start_date = offer.start_date
        // Calculate probation end date (3 months from start date)
        profileData.probation_end_date = calculateProbationEndDate(offer.start_date)
        console.log('Setting start_date from offer for new profile:', offer.start_date)
        console.log('Setting probation_end_date (3 months from start) for new profile:', profileData.probation_end_date)
      } else {
        console.warn('Offer does not have start_date set for new profile')
      }
      
      // Add contracted hours from offer (contract_hours) - ALWAYS use offer value
      // Convert to numeric if it's a string or number
      if (offer.contract_hours !== null && offer.contract_hours !== undefined) {
        const hours = typeof offer.contract_hours === 'string' 
          ? parseFloat(offer.contract_hours) 
          : offer.contract_hours
        if (!isNaN(hours) && hours > 0) {
          profileData.contracted_hours_per_week = hours
          console.log('Setting contracted_hours_per_week from offer for new profile:', hours)
        } else {
          console.warn('Offer contract_hours is invalid for new profile:', offer.contract_hours)
        }
      } else {
        console.warn('Offer does not have contract_hours set for new profile')
      }
      
      // Add hourly rate from offer (pay_rate) - only if pay_frequency is 'hourly'
      // Note: hourly_rate is stored in pence (multiply by 100), pay_rate is in pounds
      if (offer.pay_frequency === 'hourly' && offer.pay_rate !== null && offer.pay_rate !== undefined) {
        const rateInPounds = typeof offer.pay_rate === 'string' 
          ? parseFloat(offer.pay_rate) 
          : offer.pay_rate
        if (!isNaN(rateInPounds) && rateInPounds > 0) {
          // Convert pounds to pence (multiply by 100)
          profileData.hourly_rate = Math.round(rateInPounds * 100)
          console.log('Setting hourly_rate from offer for new profile:', rateInPounds, 'pounds =', profileData.hourly_rate, 'pence')
        } else {
          console.warn('Offer pay_rate is invalid for hourly rate for new profile:', offer.pay_rate)
        }
      } else if (offer.pay_frequency === 'hourly') {
        console.warn('Offer pay_frequency is hourly but pay_rate is missing for new profile')
      }
      
      // Add optional columns if they exist in the schema
      // Only include phone_number if candidate has it
      if (offer.candidate.phone_number || (offer.candidate as any).phone) {
        profileData.phone_number = offer.candidate.phone_number || (offer.candidate as any).phone
      }
      if (offer.position_title) {
        profileData.position_title = offer.position_title
      }
      if (offer.boh_foh) {
        profileData.boh_foh = offer.boh_foh
      }
      
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single()

      if (profileError) {
        console.error('Failed to create profile:', profileError)
        console.error('Profile data attempted:', profileData)
        
        // If it's a duplicate key error, try to fetch the existing profile
        if (profileError.code === '23505' || profileError.message?.includes('duplicate key')) {
          console.log('Duplicate key error - attempting to fetch existing profile...')
          const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('id, email, company_id, full_name, employee_number')
            .eq('email', offer.candidate.email.toLowerCase())
            .maybeSingle()
          
          if (fetchedProfile) {
            console.log('Found existing profile after duplicate error:', fetchedProfile.id)
            profile = fetchedProfile
            
            // Generate employee number if not already set
            let employeeNumber = fetchedProfile.employee_number
            if (!employeeNumber && company?.name) {
              employeeNumber = await generateNextEmployeeNumber(offer.company_id, company.name)
              if (employeeNumber) {
                console.log('Generated employee number after duplicate error:', employeeNumber)
              }
            }
            
            // Update it with company_id and other fields
            const updateData: any = {
              company_id: offer.company_id,
              full_name: offer.candidate.full_name,
            }
            
            if (employeeNumber) {
              updateData.employee_number = employeeNumber
            }
            if (offer.start_date) {
              updateData.start_date = offer.start_date
              // Calculate probation end date (3 months from start date)
              updateData.probation_end_date = calculateProbationEndDate(offer.start_date)
              console.log('Setting start_date from offer after duplicate error:', offer.start_date)
              console.log('Setting probation_end_date (3 months from start) after duplicate error:', updateData.probation_end_date)
            }
            // ALWAYS use offer's contract_hours value
            if (offer.contract_hours !== null && offer.contract_hours !== undefined) {
              const hours = typeof offer.contract_hours === 'string' 
                ? parseFloat(offer.contract_hours) 
                : offer.contract_hours
              if (!isNaN(hours) && hours > 0) {
                updateData.contracted_hours_per_week = hours
                console.log('Setting contracted_hours_per_week from offer after duplicate error (overriding):', hours)
              }
            }
            
            // Add hourly rate from offer (pay_rate) - only if pay_frequency is 'hourly'
            if (offer.pay_frequency === 'hourly' && offer.pay_rate !== null && offer.pay_rate !== undefined) {
              const rateInPounds = typeof offer.pay_rate === 'string' 
                ? parseFloat(offer.pay_rate) 
                : offer.pay_rate
              if (!isNaN(rateInPounds) && rateInPounds > 0) {
                updateData.hourly_rate = Math.round(rateInPounds * 100)
                console.log('Setting hourly_rate from offer after duplicate error:', rateInPounds, 'pounds =', updateData.hourly_rate, 'pence')
              }
            }
            if (offer.position_title) {
              updateData.position_title = offer.position_title
            }
            if (offer.boh_foh) {
              updateData.boh_foh = offer.boh_foh
            }
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', profile.id)
            
            if (updateError) {
              console.warn('Could not update existing profile after duplicate error:', updateError)
            } else {
              console.log('Successfully updated existing profile after duplicate error')
            }
          } else {
            return NextResponse.json(
              { 
                error: 'Failed to create profile: ' + profileError.message,
                details: profileError.details,
                hint: profileError.hint,
                code: profileError.code,
              },
              { status: 500 }
            )
          }
        } else {
          return NextResponse.json(
            { 
              error: 'Failed to create profile: ' + profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              code: profileError.code,
            },
            { status: 500 }
          )
        }
      } else {
        profile = newProfile
        console.log('Successfully created new profile:', profile.id)
      }
    }

    // 3. Auto-assign onboarding pack based on FOH/BOH + hourly/salaried
    const { data: pack, error: packError } = await supabase
      .from('company_onboarding_packs')
      .select('id')
      .eq('company_id', offer.company_id)
      .eq('boh_foh', offer.boh_foh)
      .eq('pay_type', offer.pay_type)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (packError) {
      console.warn('No matching pack found:', packError)
      // Continue without pack assignment - can be done manually
    }

    // 4. Create onboarding assignment (or reuse existing)
    let assignment = null
    
    // Check if assignment already exists (use maybeSingle to handle 0 or 1 results)
    const { data: existingAssignment, error: assignmentCheckError } = await supabase
      .from('employee_onboarding_assignments')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('company_id', offer.company_id)
      .maybeSingle()
    
    if (assignmentCheckError) {
      console.warn('Error checking for existing assignment:', assignmentCheckError)
      // Continue to try creating new one
    }
    
    if (existingAssignment) {
      console.log('Reusing existing onboarding assignment:', existingAssignment.id)
      assignment = existingAssignment
    } else {
      // Create new assignment
      const assignmentData: any = {
        profile_id: profile.id,
        company_id: offer.company_id,
        sent_at: new Date().toISOString(),
      }
      
      // Only include optional fields if they exist
      if (pack?.id) {
        assignmentData.pack_id = pack.id
      }
      if (offer.created_by) {
        assignmentData.sent_by = offer.created_by
      }
      if (offer.start_date) {
        assignmentData.start_date = offer.start_date
      }
      
      const { data: newAssignment, error: assignmentError } = await supabase
        .from('employee_onboarding_assignments')
        .insert(assignmentData)
        .select()
        .single()

      if (assignmentError) {
        console.error('Failed to create onboarding assignment:', assignmentError)
        console.error('Assignment data attempted:', assignmentData)
        
        // Check if it's a duplicate or constraint error - might already exist
        if (assignmentError.code === '23505' || assignmentError.message?.includes('duplicate')) {
          console.log('Duplicate assignment error - trying to fetch existing...')
          const { data: fetchedAssignment } = await supabase
            .from('employee_onboarding_assignments')
            .select('*')
            .eq('profile_id', profile.id)
            .eq('company_id', offer.company_id)
            .maybeSingle()
          
          if (fetchedAssignment) {
            console.log('Found existing assignment after duplicate error:', fetchedAssignment.id)
            assignment = fetchedAssignment
          } else {
            // This is critical - don't continue without assignment
            return NextResponse.json(
              { 
                error: 'Failed to create onboarding assignment: ' + assignmentError.message,
                details: assignmentError,
              },
              { status: 500 }
            )
          }
        } else {
          // For other errors, try to create a minimal assignment without optional fields
          console.warn('Assignment creation failed with non-duplicate error, trying minimal assignment:', assignmentError)
          
          // Try creating with minimal required fields only
          const minimalAssignmentData: any = {
            profile_id: profile.id,
            company_id: offer.company_id,
          }
          
          // Only add start_date if it exists and is valid
          if (offer.start_date) {
            minimalAssignmentData.start_date = offer.start_date
          }
          
          const { data: minimalAssignment, error: minimalError } = await supabase
            .from('employee_onboarding_assignments')
            .insert(minimalAssignmentData)
            .select()
            .single()
          
          if (minimalError) {
            console.error('Failed to create minimal assignment too:', minimalError)
            // Last resort: try to find any assignment for this profile
            const { data: anyAssignment } = await supabase
              .from('employee_onboarding_assignments')
              .select('*')
              .eq('profile_id', profile.id)
              .maybeSingle()
            
            if (anyAssignment) {
              console.log('Found assignment for profile (different company):', anyAssignment.id)
              assignment = anyAssignment
            } else {
              // This is critical - assignment is required for onboarding
              return NextResponse.json(
                { 
                  error: 'Failed to create onboarding assignment: ' + assignmentError.message,
                  details: assignmentError,
                  hint: 'The onboarding assignment is required. Please check the employee_onboarding_assignments table schema.',
                },
                { status: 500 }
              )
            }
          } else {
            assignment = minimalAssignment
            console.log('Created minimal onboarding assignment:', assignment.id)
          }
        }
      } else {
        assignment = newAssignment
        console.log('Created new onboarding assignment:', assignment.id)
      }
    }
    
    // Ensure we have an assignment before continuing
    if (!assignment) {
      console.error('No assignment available after all attempts')
      return NextResponse.json(
        { 
          error: 'Failed to create or find onboarding assignment',
          hint: 'Please ensure the employee_onboarding_assignments table exists and is accessible.',
        },
        { status: 500 }
      )
    }

    // 5. Generate onboarding token
    const onboardingToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // TODO: Create onboarding_tokens table entry
    // For now, we'll just return the profile ID as a simple token

    // 6. Update offer status
    const offerUpdateData: any = {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      candidate_signature: signature,
      candidate_signature_date: new Date().toISOString(),
    }
    
    // Only include fields that exist in the schema
    if (profile?.id) {
      offerUpdateData.onboarding_profile_id = profile.id
    }
    if (assignment?.id) {
      offerUpdateData.onboarding_assignment_id = assignment.id
    }
    
    const { error: updateOfferError } = await supabase
      .from('offer_letters')
      .update(offerUpdateData)
      .eq('id', offer.id)

    if (updateOfferError) {
      console.error('Failed to update offer:', updateOfferError)
      // Log but continue - offer acceptance is the main goal
    }

    // 7. Update application status to 'accepted'
    const { error: updateAppError } = await supabase
      .from('applications')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offer.application_id)

    if (updateAppError) {
      console.error('Failed to update application:', updateAppError)
    }

    // 8. Update candidate overall status to 'hired'
    const { error: updateCandidateError } = await supabase
      .from('candidates')
      .update({
        overall_status: 'hired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offer.candidate_id)

    if (updateCandidateError) {
      console.error('Failed to update candidate:', updateCandidateError)
    }

    // 9. Final verification: Ensure critical fields are set on profile
    // This is a safety net to ensure employee_number, start_date, and contracted_hours are saved
    const finalUpdateData: any = {}
    let needsFinalUpdate = false
    
    // Re-fetch profile to check current state
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('employee_number, start_date, contracted_hours_per_week, probation_end_date, hourly_rate')
      .eq('id', profile.id)
      .single()
    
    // Check and set employee number if missing
    if (!currentProfile?.employee_number && company?.name) {
      const generatedNumber = await generateNextEmployeeNumber(offer.company_id, company.name)
      if (generatedNumber) {
        finalUpdateData.employee_number = generatedNumber
        needsFinalUpdate = true
        console.log('Setting employee number in final update:', generatedNumber)
      }
    }
    
    // Check and set start_date if missing
    if (!currentProfile?.start_date && offer.start_date) {
      finalUpdateData.start_date = offer.start_date
      // Calculate probation end date (3 months from start date)
      finalUpdateData.probation_end_date = calculateProbationEndDate(offer.start_date)
      needsFinalUpdate = true
      console.log('Setting start_date in final update:', offer.start_date)
      console.log('Setting probation_end_date in final update:', finalUpdateData.probation_end_date)
    } else if (currentProfile?.start_date && offer.start_date && !currentProfile?.probation_end_date) {
      // If start_date exists but probation_end_date is missing, calculate it
      finalUpdateData.probation_end_date = calculateProbationEndDate(currentProfile.start_date)
      needsFinalUpdate = true
      console.log('Setting probation_end_date in final update (from existing start_date):', finalUpdateData.probation_end_date)
    }
    
    // ALWAYS update contracted_hours_per_week from offer (even if already set)
    // This ensures the profile matches the accepted offer
    if (offer.contract_hours !== null && offer.contract_hours !== undefined) {
      const hours = typeof offer.contract_hours === 'string' 
        ? parseFloat(offer.contract_hours) 
        : offer.contract_hours
      if (!isNaN(hours) && hours > 0) {
        // Check if it's different from current value
        const currentHours = currentProfile?.contracted_hours_per_week
        if (currentHours !== hours) {
          finalUpdateData.contracted_hours_per_week = hours
          needsFinalUpdate = true
          console.log('Updating contracted_hours_per_week in final update:', hours, '(was:', currentHours || 'not set', ')')
        } else {
          console.log('contracted_hours_per_week already matches offer:', hours)
        }
      }
    }
    
    // ALWAYS update hourly_rate from offer if pay_frequency is 'hourly' (even if already set)
    // This ensures the profile matches the accepted offer
    if (offer.pay_frequency === 'hourly' && offer.pay_rate !== null && offer.pay_rate !== undefined) {
      const rateInPounds = typeof offer.pay_rate === 'string' 
        ? parseFloat(offer.pay_rate) 
        : offer.pay_rate
      if (!isNaN(rateInPounds) && rateInPounds > 0) {
        const rateInPence = Math.round(rateInPounds * 100)
        const currentRateInPence = currentProfile?.hourly_rate
        if (currentRateInPence !== rateInPence) {
          finalUpdateData.hourly_rate = rateInPence
          needsFinalUpdate = true
          console.log('Updating hourly_rate in final update:', rateInPounds, 'pounds =', rateInPence, 'pence', '(was:', currentRateInPence ? (currentRateInPence / 100) + ' pounds' : 'not set', ')')
        } else {
          console.log('hourly_rate already matches offer:', rateInPounds, 'pounds')
        }
      }
    }
    
    if (needsFinalUpdate) {
      console.log('Performing final profile update with data:', finalUpdateData)
      const { error: finalUpdateError } = await supabase
        .from('profiles')
        .update(finalUpdateData)
        .eq('id', profile.id)
      
      if (finalUpdateError) {
        console.error('Final profile update failed (non-critical):', finalUpdateError)
      } else {
        console.log('✅ Final profile update successful:', finalUpdateData)
        // Verify the update worked
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('employee_number, start_date, contracted_hours_per_week, probation_end_date, hourly_rate')
          .eq('id', profile.id)
          .single()
        console.log('✅ Verified profile after final update:', verifyProfile)
      }
    } else {
      console.log('✅ No final update needed - all fields already set correctly')
      // Still log what we have for debugging
      console.log('Current profile state:', {
        employee_number: currentProfile?.employee_number,
        start_date: currentProfile?.start_date,
        contracted_hours_per_week: currentProfile?.contracted_hours_per_week
      })
    }

    // TODO: Send onboarding email with link

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      assignmentId: assignment?.id,
      onboardingToken: profile.id, // For now, use profile ID as token
      employeeNumber: finalUpdateData.employee_number || currentProfile?.employee_number,
      message: 'Offer accepted successfully! Redirecting to onboarding...',
    })
  } catch (error: any) {
    console.error('Accept offer error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
