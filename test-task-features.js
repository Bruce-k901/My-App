/**
 * Test Script: Verify Task Features Population
 * 
 * This script tests the generate-daily-tasks edge function and verifies
 * that task features (checklist items, temperature fields, etc.) are properly populated.
 * 
 * Usage:
 *   node test-task-features.js
 * 
 * Make sure to set your environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

const https = require('https');

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Tip: Create a .env.local file with these variables');
  process.exit(1);
}

// Extract project reference from URL
const projectMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
if (!projectMatch) {
  console.error('❌ Invalid SUPABASE_URL format. Expected: https://PROJECT_REF.supabase.co');
  process.exit(1);
}

const projectRef = projectMatch[1];
const functionUrl = `${SUPABASE_URL}/functions/v1/generate-daily-tasks`;

console.log('🧪 Testing Task Features Population\n');
console.log(`📍 Project: ${projectRef}`);
console.log(`🔗 Function URL: ${functionUrl}\n`);

// Step 1: Trigger the edge function
console.log('1️⃣  Triggering generate-daily-tasks edge function...\n');

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(functionUrl, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (res.statusCode === 200 && result.success) {
        console.log('✅ Edge function executed successfully!\n');
        console.log('📊 Results:');
        console.log(`   - Daily tasks created: ${result.daily_tasks_created || 0}`);
        console.log(`   - Weekly tasks created: ${result.weekly_tasks_created || 0}`);
        console.log(`   - Monthly tasks created: ${result.monthly_tasks_created || 0}`);
        console.log(`   - Total tasks created: ${result.total_tasks_created || 0}`);
        
        if (result.errors && result.errors.length > 0) {
          console.log('\n⚠️  Errors encountered:');
          result.errors.forEach((error, i) => {
            console.log(`   ${i + 1}. ${error}`);
          });
        }
        
        console.log('\n2️⃣  Verifying task features...\n');
        verifyTaskFeatures();
      } else {
        console.error('❌ Edge function failed:');
        console.error(JSON.stringify(result, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to parse response:');
      console.error(data);
      console.error('\nError:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:');
  console.error(error.message);
  process.exit(1);
});

req.end();

// Step 2: Verify task features in database
async function verifyTaskFeatures() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get today's tasks with task_data
    const { data: tasks, error } = await supabase
      .from('checklist_tasks')
      .select(`
        id,
        custom_name,
        template_id,
        due_date,
        task_data,
        task_templates (
          name,
          evidence_types,
          recurrence_pattern
        )
      `)
      .eq('due_date', today)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Failed to fetch tasks:', error.message);
      return;
    }
    
    if (!tasks || tasks.length === 0) {
      console.log('⚠️  No tasks found for today.');
      console.log('   This might be normal if no tasks are scheduled for today.');
      return;
    }
    
    console.log(`📋 Found ${tasks.length} task(s) for today\n`);
    
    let tasksWithFeatures = 0;
    let tasksWithChecklist = 0;
    let tasksWithTemperatures = 0;
    let tasksWithAssets = 0;
    
    tasks.forEach((task, index) => {
      const taskData = task.task_data || {};
      const template = task.task_templates;
      const hasFeatures = Object.keys(taskData).length > 0;
      const hasChecklist = !!(taskData.checklistItems || taskData.yesNoChecklistItems);
      const hasTemperatures = !!taskData.temperatures;
      const hasAssets = !!taskData.selectedAssets;
      
      if (hasFeatures) tasksWithFeatures++;
      if (hasChecklist) tasksWithChecklist++;
      if (hasTemperatures) tasksWithTemperatures++;
      if (hasAssets) tasksWithAssets++;
      
      console.log(`${index + 1}. ${task.custom_name || 'Unnamed Task'}`);
      console.log(`   Template: ${template?.name || 'N/A'}`);
      console.log(`   Features: ${hasFeatures ? '✅' : '❌'} ${Object.keys(taskData).length} field(s)`);
      
      if (hasChecklist) {
        const checklistType = taskData.yesNoChecklistItems ? 'Yes/No' : 'Regular';
        const count = taskData.yesNoChecklistItems?.length || taskData.checklistItems?.length || 0;
        console.log(`   Checklist: ✅ ${checklistType} (${count} items)`);
      } else if (template?.recurrence_pattern?.default_checklist_items) {
        console.log(`   Checklist: ⚠️  Template has checklist items but task doesn't`);
      } else {
        console.log(`   Checklist: ➖ Not applicable`);
      }
      
      if (hasTemperatures) {
        const tempCount = Array.isArray(taskData.temperatures) ? taskData.temperatures.length : 0;
        console.log(`   Temperatures: ✅ ${tempCount} entry/entries`);
      } else if (template?.evidence_types?.includes('temperature')) {
        console.log(`   Temperatures: ⚠️  Template requires temperatures but task doesn't have them`);
      } else {
        console.log(`   Temperatures: ➖ Not applicable`);
      }
      
      if (hasAssets) {
        const assetCount = Array.isArray(taskData.selectedAssets) ? taskData.selectedAssets.length : 0;
        console.log(`   Assets: ✅ ${assetCount} asset(s)`);
      } else {
        console.log(`   Assets: ➖ Not applicable`);
      }
      
      console.log('');
    });
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   - Tasks with features: ${tasksWithFeatures}/${tasks.length}`);
    console.log(`   - Tasks with checklist: ${tasksWithChecklist}`);
    console.log(`   - Tasks with temperatures: ${tasksWithTemperatures}`);
    console.log(`   - Tasks with assets: ${tasksWithAssets}\n`);
    
    if (tasksWithFeatures === tasks.length) {
      console.log('✅ All tasks have features populated!');
    } else {
      console.log('⚠️  Some tasks are missing features. Check the details above.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying tasks:', error.message);
  }
}
