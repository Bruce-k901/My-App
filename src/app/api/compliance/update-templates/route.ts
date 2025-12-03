import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllTemplates } from '@/data/compliance-templates';

/**
 * Update existing compliance templates with correct asset_type and repeatable_field_name
 * This fixes templates that were imported before these fields were added
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase credentials are not configured.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { company_id } = await request.json();
    
    // Get all templates from TypeScript definitions
    const templates = getAllTemplates();
    
    const updated = [];
    const skipped = [];
    
    for (const template of templates) {
      // Find existing template by slug
      let query = supabase
        .from('task_templates')
        .select('id, name, slug, asset_type, repeatable_field_name')
        .eq('slug', template.slug);
      
      if (company_id === null) {
        query = query.is('company_id', null);
      } else {
        query = query.eq('company_id', company_id);
      }
      
      const { data: existing } = await query.maybeSingle();

      if (!existing) {
        skipped.push({ slug: template.slug, name: template.name, reason: 'Template not found' });
        continue;
      }

      // Check if update is needed
      const needsUpdate = 
        existing.asset_type !== template.asset_type ||
        existing.repeatable_field_name !== template.repeatable_field_name;

      if (!needsUpdate) {
        skipped.push({ slug: template.slug, name: template.name, reason: 'Already up to date' });
        continue;
      }

      // Update template with correct asset_type and repeatable_field_name
      const { error: updateError } = await supabase
        .from('task_templates')
        .update({
          asset_type: template.asset_type,
          repeatable_field_name: template.repeatable_field_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`Error updating ${template.name}:`, updateError);
        skipped.push({ 
          slug: template.slug, 
          name: template.name, 
          reason: updateError.message 
        });
      } else {
        updated.push({ 
          id: existing.id, 
          name: existing.name, 
          slug: existing.slug,
          changes: {
            asset_type: { from: existing.asset_type, to: template.asset_type },
            repeatable_field_name: { from: existing.repeatable_field_name, to: template.repeatable_field_name }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updated.length,
      skipped: skipped.length,
      details: {
        updated,
        skipped
      }
    });

  } catch (error: any) {
    console.error('Error updating templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update templates' },
      { status: 500 }
    );
  }
}

