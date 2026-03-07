/**
 * Regenerate today's tasks
 *
 * 1. Deletes today's PENDING tasks (preserves completed ones)
 * 2. Calls the generate-daily-tasks edge function to recreate them
 *
 * Usage: npx tsx scripts/regenerate-todays-tasks.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n📅 Regenerating tasks for: ${today}\n`);

  // 1. Count existing tasks for today
  const { data: existingTasks, error: countError } = await supabase
    .from('checklist_tasks')
    .select('id, status, template_id, custom_name, daypart')
    .eq('due_date', today);

  if (countError) {
    console.error('Error fetching existing tasks:', countError.message);
    process.exit(1);
  }

  const pendingTasks = existingTasks?.filter(t => t.status === 'pending') || [];
  const completedTasks = existingTasks?.filter(t => t.status !== 'pending') || [];

  console.log(`📊 Found ${existingTasks?.length || 0} total tasks for today:`);
  console.log(`   - ${pendingTasks.length} pending (will be deleted & regenerated)`);
  console.log(`   - ${completedTasks.length} completed/other (will be preserved)\n`);

  // 2. Delete pending tasks
  if (pendingTasks.length > 0) {
    const pendingIds = pendingTasks.map(t => t.id);

    const { error: deleteError } = await supabase
      .from('checklist_tasks')
      .delete()
      .in('id', pendingIds);

    if (deleteError) {
      console.error('Error deleting pending tasks:', deleteError.message);
      process.exit(1);
    }

    console.log(`🗑️  Deleted ${pendingIds.length} pending tasks\n`);
  } else {
    console.log('ℹ️  No pending tasks to delete\n');
  }

  // 3. Call the generate-daily-tasks edge function
  console.log('🔄 Calling generate-daily-tasks edge function...\n');

  const response = await fetch(
    `${supabaseUrl}/functions/v1/generate-daily-tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ Edge function error:', result);
    process.exit(1);
  }

  // 4. Show results
  console.log('✅ Task generation complete!\n');
  console.log('📊 Generation results:');

  if (result.daily_tasks_created !== undefined) {
    console.log(`   Daily tasks:       ${result.daily_tasks_created}`);
  }
  if (result.weekly_tasks_created !== undefined) {
    console.log(`   Weekly tasks:      ${result.weekly_tasks_created}`);
  }
  if (result.monthly_tasks_created !== undefined) {
    console.log(`   Monthly tasks:     ${result.monthly_tasks_created}`);
  }
  if (result.total_tasks_created !== undefined) {
    console.log(`   Total created:     ${result.total_tasks_created}`);
  }

  if (result.errors && result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    result.errors.forEach((err: string) => console.log(`   - ${err}`));
  }

  // 5. Verify custom fields tasks
  console.log('\n🔍 Checking custom fields tasks...');

  const { data: newTasks } = await supabase
    .from('checklist_tasks')
    .select(`
      id, custom_name, status, daypart, task_data,
      template:task_templates(id, name, use_custom_fields)
    `)
    .eq('due_date', today)
    .eq('status', 'pending');

  const customFieldsTasks = newTasks?.filter(
    (t: any) => t.template?.use_custom_fields || (t.task_data as any)?.use_custom_fields
  ) || [];

  if (customFieldsTasks.length > 0) {
    console.log(`\n✅ Found ${customFieldsTasks.length} custom fields task(s):`);
    customFieldsTasks.forEach((t: any) => {
      const hasFlag = (t.task_data as any)?.use_custom_fields;
      console.log(`   - "${t.custom_name || t.template?.name}" (daypart: ${t.daypart})`);
      console.log(`     template.use_custom_fields: ${t.template?.use_custom_fields}`);
      console.log(`     task_data.use_custom_fields: ${hasFlag || false}`);
    });
  } else {
    console.log('   No custom fields tasks found. Make sure you have active site_checklists for custom fields templates.');
  }

  console.log('\n🎉 Done! Refresh your Today\'s Tasks page to see the updated tasks.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
