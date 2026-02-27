/**
 * Verify the custom fields chain is connected end-to-end
 * Usage: npx tsx scripts/verify-custom-fields.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n=== Custom Fields Chain Verification (${today}) ===\n`);

  // 1. Find all custom fields templates
  const { data: templates } = await supabase
    .from('task_templates')
    .select('id, name, use_custom_fields, evidence_types')
    .eq('use_custom_fields', true);

  console.log(`1. Custom fields templates: ${templates?.length || 0}`);
  templates?.forEach(t => {
    console.log(`   - "${t.name}" (${t.id})`);
    console.log(`     use_custom_fields: ${t.use_custom_fields}`);
    console.log(`     evidence_types: ${JSON.stringify(t.evidence_types)}`);
  });

  // 2. Check template_fields for each template
  console.log(`\n2. Template fields:`);
  for (const t of templates || []) {
    const { data: fields } = await supabase
      .from('template_fields')
      .select('id, field_name, field_type, label, required, field_order, parent_field_id')
      .eq('template_id', t.id)
      .order('field_order');

    const topLevel = fields?.filter(f => !f.parent_field_id) || [];
    console.log(`   "${t.name}": ${topLevel.length} top-level fields`);
    topLevel.forEach(f => {
      console.log(`     - [${f.field_type}] "${f.label}" (${f.field_name}) ${f.required ? '*required' : ''}`);
    });
  }

  // 3. Check today's tasks for these templates
  console.log(`\n3. Today's tasks from custom fields templates:`);
  const templateIds = templates?.map(t => t.id) || [];

  if (templateIds.length === 0) {
    console.log('   No custom fields templates found!');
    return;
  }

  const { data: tasks } = await supabase
    .from('checklist_tasks')
    .select('id, custom_name, status, template_id, task_data, daypart')
    .eq('due_date', today)
    .in('template_id', templateIds);

  console.log(`   Found ${tasks?.length || 0} tasks`);
  tasks?.forEach(t => {
    const td = t.task_data as any;
    console.log(`   - "${t.custom_name}" (status: ${t.status}, daypart: ${t.daypart})`);
    console.log(`     template_id: ${t.template_id}`);
    console.log(`     task_data keys: ${td ? Object.keys(td).join(', ') || '(empty object)' : 'null'}`);
    console.log(`     task_data.use_custom_fields: ${td?.use_custom_fields || 'NOT SET'}`);
  });

  // 4. Simulate what the todays_tasks page query returns
  console.log(`\n4. Simulating todays_tasks page template query:`);
  const { data: pageTemplates, error: pageError } = await supabase
    .from('task_templates')
    .select(`
      id, name, slug, description, category, frequency, compliance_standard, is_critical,
      evidence_types, repeatable_field_name, instructions, dayparts, recurrence_pattern,
      asset_id, time_of_day, use_custom_fields, notes, notification_config,
      template_fields (*)
    `)
    .in('id', templateIds);

  if (pageError) {
    console.log(`   ERROR: ${pageError.message}`);
    console.log(`   Code: ${pageError.code}`);
    console.log(`   Details: ${pageError.details}`);
  } else {
    pageTemplates?.forEach(t => {
      const fields = (t as any).template_fields || [];
      console.log(`   "${t.name}":`);
      console.log(`     use_custom_fields: ${(t as any).use_custom_fields}`);
      console.log(`     template_fields count: ${fields.length}`);
      console.log(`     template_fields: ${fields.map((f: any) => `${f.field_type}:${f.label}`).join(', ')}`);
    });
  }

  // 5. Simulate useTaskState detection
  console.log(`\n5. useTaskState simulation:`);
  for (const task of tasks || []) {
    const template = pageTemplates?.find(t => t.id === task.template_id);
    const taskDataRaw = task.task_data as any;

    const willDetectCustomFields = !!(template as any)?.use_custom_fields || !!taskDataRaw?.use_custom_fields;
    console.log(`   "${task.custom_name}":`);
    console.log(`     template.use_custom_fields = ${(template as any)?.use_custom_fields}`);
    console.log(`     task_data.use_custom_fields = ${taskDataRaw?.use_custom_fields || false}`);
    console.log(`     => Will detect custom fields: ${willDetectCustomFields ? 'YES' : 'NO'}`);

    if (willDetectCustomFields && template) {
      const { data: fields } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', template.id)
        .order('field_order');

      console.log(`     => Will load ${fields?.length || 0} template_fields from DB`);
    }
  }

  console.log('\n=== Done ===\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
