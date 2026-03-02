import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '..', '.env.local') });

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check template_fields for Dough template
  const { data, error } = await supabase
    .from('template_fields')
    .select('id, field_name, field_type, label, field_order')
    .eq('template_id', 'ecf91994-20a8-415f-abe8-c564f94b7130')
    .order('field_order');

  console.log('Dough template fields:', data?.length || 0, 'fields');
  if (error) console.log('Error:', error.message);
  data?.forEach(f => console.log(`  ${f.field_order} [${f.field_type}] ${f.label}`));

  // Check total template_fields across all templates
  const { count } = await supabase
    .from('template_fields')
    .select('*', { count: 'exact', head: true });
  console.log('\nTotal template_fields in DB:', count);

  // Check all custom fields templates
  const { data: templates } = await supabase
    .from('task_templates')
    .select('id, name, use_custom_fields')
    .eq('use_custom_fields', true);

  console.log('\nCustom fields templates:', templates?.length || 0);
  for (const t of templates || []) {
    const { data: fields } = await supabase
      .from('template_fields')
      .select('id')
      .eq('template_id', t.id);
    console.log(`  "${t.name}": ${fields?.length || 0} fields`);
  }
}

main().catch(console.error);
