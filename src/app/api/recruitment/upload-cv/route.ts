import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { candidateId, companyId, fileName, fileData, fileType } = body

    if (!candidateId || !companyId || !fileName || !fileData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert base64 data URL to buffer
    const base64Data = fileData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to storage
    const cvPath = `${companyId}/candidates/${candidateId}/${fileName}`
    
    const { data, error: uploadError } = await supabase.storage
      .from('recruitment_cvs')
      .upload(cvPath, buffer, {
        contentType: fileType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload CV: ${uploadError.message}`)
    }

    // Update candidate with CV path
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ cv_file_path: cvPath })
      .eq('id', candidateId)

    if (updateError) {
      console.error('Failed to update candidate CV path:', updateError)
      throw new Error('CV uploaded but failed to update candidate record')
    }

    return NextResponse.json({
      success: true,
      cvPath,
      message: 'CV uploaded successfully',
    })
  } catch (error: any) {
    console.error('CV upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload CV' },
      { status: 500 }
    )
  }
}
