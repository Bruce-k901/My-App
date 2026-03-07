import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/send-email'
import { generatePestSightingEmailHTML } from '@/lib/emails/pestSightingNotification'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sightingId, companyId, siteId } = body

    if (!sightingId || !companyId) {
      return NextResponse.json({ error: 'Missing sightingId or companyId' }, { status: 400 })
    }

    // 1. Fetch the sighting record
    const { data: sighting, error: sightingError } = await supabaseAdmin
      .from('pest_sightings')
      .select('*')
      .eq('id', sightingId)
      .single()

    if (sightingError || !sighting) {
      return NextResponse.json({ error: 'Sighting not found' }, { status: 404 })
    }

    // 2. Look up active pest control contract → contractor
    const { data: contract } = await supabaseAdmin
      .from('pest_control_contracts')
      .select('contractor:contractors(id, name, email, contact_name, phone)')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const contractor = (contract as any)?.contractor
    if (!contractor?.email) {
      return NextResponse.json(
        { error: 'No active pest control contractor with an email address found. Please set up your pest control contract first.' },
        { status: 400 },
      )
    }

    // 3. Fetch site + company names for the email
    const [siteResult, companyResult] = await Promise.all([
      siteId
        ? supabaseAdmin.from('sites').select('name').eq('id', siteId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from('companies').select('name').eq('id', companyId).maybeSingle(),
    ])

    const siteName = siteResult?.data?.name || 'Unknown site'
    const companyName = companyResult?.data?.name || 'Unknown company'

    // 4. Build and send the email
    const isUrgent = sighting.severity === 'high' || sighting.severity === 'critical'
    const pestLabel = (sighting.pest_type || '').replace(/_/g, ' ')
    const subject = `${isUrgent ? 'URGENT: ' : ''}Pest Sighting — ${pestLabel} at ${siteName}`

    const html = generatePestSightingEmailHTML({
      siteName,
      companyName,
      reportedBy: sighting.reported_by_name || 'Staff member',
      sightingDate: sighting.sighting_date,
      sightingTime: sighting.sighting_time,
      pestType: sighting.pest_type,
      evidenceType: sighting.evidence_type,
      locationArea: sighting.location_area,
      locationDetails: sighting.location_details,
      severity: sighting.severity,
      quantityEstimate: sighting.quantity_estimate,
      immediateActionTaken: sighting.immediate_action_taken,
      notes: sighting.notes,
    })

    const emailResult = await sendEmail({
      to: contractor.email,
      subject,
      html,
    })

    if (!emailResult.success && !emailResult.skipped) {
      return NextResponse.json({ error: emailResult.error || 'Failed to send email' }, { status: 500 })
    }

    // 5. Update sighting to mark contractor as notified
    await supabaseAdmin
      .from('pest_sightings')
      .update({ contractor_notified: true })
      .eq('id', sightingId)

    return NextResponse.json({
      success: true,
      contractorName: contractor.name,
      contractorEmail: contractor.email,
      skipped: emailResult.skipped || false,
    })
  } catch (err: any) {
    console.error('Error notifying contractor:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
