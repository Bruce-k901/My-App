import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateId, cvPath } = body

    if (!candidateId || !cvPath) {
      return NextResponse.json(
        { error: 'Missing candidateId or cvPath' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('candidates')
      .update({ cv_file_path: cvPath })
      .eq('id', candidateId)

    if (error) {
      console.error('Failed to update CV path:', error)
      throw new Error('Failed to update CV path')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update CV path error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update CV path' },
      { status: 500 }
    )
  }
}
