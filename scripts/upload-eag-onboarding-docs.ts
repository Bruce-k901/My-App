import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// EAG Company ID
const EAG_COMPANY_ID = 'f99510bc-b290-47c6-8f12-282bea67bd91'

// Map files to document metadata
const documents = [
  {
    fileName: 'Essential Food hygiene.doc',
    name: 'Essential Food Hygiene Certificate',
    category: 'Onboarding - Training',
    docKey: 'food_hygiene_cert',
    notes: 'Level 2 Food Safety & Hygiene certification'
  },
  {
    fileName: 'Holiday Request Form.doc',
    name: 'Holiday Request Form',
    category: 'Onboarding - Forms',
    docKey: 'holiday_request_form',
    notes: 'Template for requesting annual leave'
  },
  {
    fileName: 'New details form.doc',
    name: 'New Starter Details Form',
    category: 'Onboarding - Forms',
    docKey: 'new_starter_form',
    notes: 'Collect employee information for onboarding'
  },
  {
    fileName: 'New Starter Form.xlsx',
    name: 'New Starter Form (Excel)',
    category: 'Onboarding - Forms',
    docKey: 'new_starter_form_excel',
    notes: 'Alternative Excel version of new starter form'
  },
  {
    fileName: 'Offer letter BOH Salaried.docx',
    name: 'Employment Contract - BOH Salaried',
    category: 'Onboarding - Contracts',
    docKey: 'contract_boh_salaried',
    notes: 'Employment contract for back-of-house salaried employees'
  },
  {
    fileName: 'Pre Med questionaire.doc',
    name: 'Health Declaration Form',
    category: 'Onboarding - Forms',
    docKey: 'health_declaration',
    notes: 'Pre-employment health questionnaire'
  },
  {
    fileName: 'Salary FOH Contract.docx',
    name: 'Employment Contract - FOH Salaried',
    category: 'Onboarding - Contracts',
    docKey: 'contract_foh_salaried',
    notes: 'Employment contract for front-of-house salaried employees'
  },
  {
    fileName: 'Starter_checklist.pdf',
    name: 'Starter Checklist',
    category: 'Onboarding - Forms',
    docKey: 'starter_checklist',
    notes: 'Onboarding checklist for new employees'
  },
  {
    fileName: 'Uniform issue.doc',
    name: 'Uniform Issued Record',
    category: 'Onboarding - Forms',
    docKey: 'uniform_issued',
    notes: 'Track uniform items issued to staff'
  },
  {
    fileName: 'Wage Deduction authorisation.doc',
    name: 'Wage Deduction Authorisation',
    category: 'Onboarding - Forms',
    docKey: 'wage_deduction_auth',
    notes: 'Authorization for uniform/equipment deductions'
  },
  {
    fileName: 'Work Permit Disclaimer.doc',
    name: 'Right to Work Verification',
    category: 'Onboarding - Forms',
    docKey: 'work_permit_disclaimer',
    notes: 'Work permit and right-to-work documentation'
  }
]

async function uploadDocuments() {
  console.log('🚀 Starting upload of EAG onboarding documents...\n')

  const docsFolder = path.join(process.cwd(), 'Onbaording Docs')
  
  if (!fs.existsSync(docsFolder)) {
    console.error('❌ Folder not found:', docsFolder)
    process.exit(1)
  }

  let successCount = 0
  let errorCount = 0

  for (const doc of documents) {
    console.log(`\n📄 Processing: ${doc.fileName}`)
    
    try {
      const filePath = path.join(docsFolder, doc.fileName)
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${doc.fileName}`)
        errorCount++
        continue
      }

      // Read file
      const fileBuffer = fs.readFileSync(filePath)
      const fileExt = path.extname(doc.fileName)
      
      // Generate storage path
      const storagePath = `${EAG_COMPANY_ID}/onboarding/${doc.docKey}${fileExt}`

      // Upload to Supabase Storage
      console.log(`   ⬆️  Uploading to storage: ${storagePath}`)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('global_docs')
        .upload(storagePath, fileBuffer, {
          contentType: getContentType(fileExt),
          upsert: true // Overwrite if exists
        })

      if (uploadError) {
        console.error(`   ❌ Upload failed:`, uploadError.message)
        errorCount++
        continue
      }

      // Check if document already exists in database
      const { data: existingDoc } = await supabase
        .from('global_documents')
        .select('id')
        .eq('company_id', EAG_COMPANY_ID)
        .eq('doc_key', doc.docKey)
        .single()

      if (existingDoc) {
        // Update existing document
        console.log(`   📝 Updating existing database record`)
        const { error: updateError } = await supabase
          .from('global_documents')
          .update({
            file_path: storagePath,
            is_placeholder: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDoc.id)

        if (updateError) {
          console.error(`   ❌ Database update failed:`, updateError.message)
          errorCount++
          continue
        }
      } else {
        // Create new document entry
        console.log(`   📝 Creating new database record`)
        const { error: insertError } = await supabase
          .from('global_documents')
          .insert({
            company_id: EAG_COMPANY_ID,
            doc_key: doc.docKey,
            category: doc.category,
            name: doc.name,
            notes: doc.notes,
            file_path: storagePath,
            is_placeholder: false,
            is_active: true,
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`   ❌ Database insert failed:`, insertError.message)
          errorCount++
          continue
        }
      }

      console.log(`   ✅ Successfully uploaded: ${doc.name}`)
      successCount++

    } catch (error: any) {
      console.error(`   ❌ Error processing ${doc.fileName}:`, error.message)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successfully uploaded: ${successCount} documents`)
  console.log(`❌ Failed: ${errorCount} documents`)
  console.log('='.repeat(60))
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel'
  }
  return contentTypes[ext.toLowerCase()] || 'application/octet-stream'
}

// Run the upload
uploadDocuments()
  .then(() => {
    console.log('\n✨ Upload complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
