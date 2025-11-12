import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllTemplates, SFBB_TEMPERATURE_FIELDS } from '@/data/compliance-templates';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn(
        "[import-templates] Skipping import because Supabase environment variables are missing"
      );

      return NextResponse.json(
        {
          success: false,
          imported: 0,
          skipped: 0,
          details: {
            imported: [],
            skipped: [],
          },
          message: "Supabase credentials are not configured.",
        },
        { status: 200 }
      );
    }

    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Get company_id from request body (null = global templates)
    const { company_id } = await request.json();
    
    // company_id can be null for global templates

    // Get all templates from TypeScript definitions
    const templates = getAllTemplates();
    
    // Import each template (skip if already exists by slug)
    const imported = [];
    const skipped = [];
    
    for (const template of templates) {
      // Check if template already exists (global or for this company)
      let query = supabase
        .from('task_templates')
        .select('id, name')
        .eq('slug', template.slug);
      
      if (company_id === null) {
        query = query.is('company_id', null);
      } else {
        query = query.eq('company_id', company_id);
      }
      
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        skipped.push({ slug: template.slug, name: template.name, reason: 'Already exists' });
        continue;
      }

      // Prepare template data for insertion (remove workflow-specific fields)
      const {
        workflowType,
        workflowConfig,
        id,
        created_at,
        updated_at,
        ...templateData
      } = template;

      const workflowEnvelope =
        workflowType || workflowConfig
          ? {
              type: workflowType ?? null,
              config: workflowConfig ?? null,
            }
          : null;

      const normalizedRecurrence =
        templateData.recurrence_pattern && typeof templateData.recurrence_pattern === 'object'
          ? { ...templateData.recurrence_pattern }
          : templateData.recurrence_pattern
          ? templateData.recurrence_pattern
          : {};

      const recurrenceWithWorkflow =
        workflowEnvelope && typeof normalizedRecurrence === 'object'
          ? { ...normalizedRecurrence, __workflow: workflowEnvelope }
          : normalizedRecurrence;

      // Insert template with company_id
      const { data: inserted, error: insertError } = await supabase
        .from('task_templates')
        .insert({
          ...templateData,
          company_id,
          tags: Array.from(
            new Set([...(Array.isArray(templateData.tags) ? templateData.tags : []), 'compliance_module'])
          ),
          recurrence_pattern: recurrenceWithWorkflow,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting ${template.name}:`, insertError);
        skipped.push({ 
          slug: template.slug, 
          name: template.name, 
          reason: insertError.message 
        });
      } else {
        // Import template fields for SFBB Temperature Checks
        if (template.slug === 'sfbb-temperature-checks') {
          const fieldsToInsert = SFBB_TEMPERATURE_FIELDS.map(field => ({
            template_id: inserted.id,
            field_name: field.field_name,
            field_type: field.field_type,
            label: field.label,
            required: field.required,
            field_order: field.field_order,
            help_text: field.help_text,
            options: field.options || null,
          }));

          const { error: fieldsError } = await supabase
            .from('template_fields')
            .insert(fieldsToInsert);

          if (fieldsError) {
            console.error(`Error inserting fields for ${template.name}:`, fieldsError);
          }
        }

        imported.push({ id: inserted.id, name: inserted.name, slug: inserted.slug });
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      details: {
        imported,
        skipped
      }
    });

  } catch (error: any) {
    console.error('Error importing templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import templates' },
      { status: 500 }
    );
  }
}

