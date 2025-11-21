/**
 * Verification script to check if cron prerequisites are met
 * Run with: npx tsx scripts/verify-cron-setup.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyCronSetup() {
  console.log('🔍 Verifying Today\'s Tasks Cron Setup...\n')

  // Check 1: Active task templates
  const { data: templates, error: templateError } = await supabase
    .from('task_templates')
    .select('id, name, frequency, is_active')
    .eq('is_active', true)

  if (templateError) {
    console.error('❌ Error checking templates:', templateError.message)
  } else {
    console.log(`✅ Active task templates: ${templates?.length || 0}`)
    if (templates && templates.length > 0) {
      templates.forEach(t => {
        console.log(`   - ${t.name} (${t.frequency})`)
      })
    } else {
      console.warn('⚠️  WARNING: No active task templates found!')
    }
  }

  // Check 2: Active sites
  const { data: sites, error: siteError } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('is_active', true)

  if (siteError) {
    console.error('❌ Error checking sites:', siteError.message)
  } else {
    console.log(`\n✅ Active sites: ${sites?.length || 0}`)
    if (sites && sites.length > 0) {
      sites.forEach(s => {
        console.log(`   - ${s.name}`)
      })
    } else {
      console.warn('⚠️  WARNING: No active sites found!')
    }
  }

  // Check 3: Today's tasks
  const today = new Date().toISOString().split('T')[0]
  const { data: tasks, error: taskError } = await supabase
    .from('checklist_tasks')
    .select('id, template_id, site_id, due_date')
    .eq('due_date', today)

  if (taskError) {
    console.error('❌ Error checking today\'s tasks:', taskError.message)
  } else {
    console.log(`\n✅ Tasks for today (${today}): ${tasks?.length || 0}`)
    if (!tasks || tasks.length === 0) {
      console.log('ℹ️  No tasks generated yet. This is normal if:')
      console.log('   - Cron hasn\'t run yet (runs at midnight UTC)')
      console.log('   - This is the first setup')
      console.log('   - You need to run manual generation first')
    }
  }

  // Check 4: Duplicates
  const { data: duplicates, error: dupError } = await supabase
    .from('checklist_tasks')
    .select('due_date, template_id, site_id')
    .eq('due_date', today)

  if (!dupError && duplicates) {
    const grouped = duplicates.reduce((acc, task) => {
      const key = `${task.due_date}-${task.template_id}-${task.site_id}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const hasDuplicates = Object.values(grouped).some(count => count > 1)
    
    if (hasDuplicates) {
      console.log('\n⚠️  WARNING: Duplicate tasks detected!')
      console.log('   This may indicate the cron is running multiple times.')
    } else {
      console.log('\n✅ No duplicate tasks detected')
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📋 SUMMARY')
  console.log('='.repeat(50))
  
  const hasTemplates = templates && templates.length > 0
  const hasSites = sites && sites.length > 0
  
  if (hasTemplates && hasSites) {
    console.log('✅ Prerequisites met! Cron setup can proceed.')
    console.log('\n📝 Next steps:')
    console.log('1. Go to Supabase Dashboard → Edge Functions')
    console.log('2. Configure cron schedule for generate-daily-tasks')
    console.log('3. See docs/CRON_SETUP_INSTRUCTIONS.md for details')
  } else {
    console.log('❌ Prerequisites NOT met!')
    if (!hasTemplates) {
      console.log('   - Need to create active task templates')
    }
    if (!hasSites) {
      console.log('   - Need to create active sites')
    }
  }
  
  console.log('\n✨ Verification complete!')
}

verifyCronSetup().catch(console.error)

