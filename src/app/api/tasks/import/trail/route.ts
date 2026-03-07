import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { slugify, type TrailChecklistItem, type TrailDetectedFieldGroup } from '@/lib/trail-import';

interface ImportTemplate {
  name: string;
  category: string;
  frequency: string;
  checklistItems: TrailChecklistItem[];
  detectedFields: TrailDetectedFieldGroup;
  matchedTemplateSlug?: string;
  overrideEvidenceTypes?: string[];
}

interface ImportBody {
  company_id: string;
  site_ids: string[];
  templates: ImportTemplate[];
}

// site_checklists only allows: daily, weekly, monthly, annually, triggered
const VALID_SITE_CHECKLIST_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'annually', 'triggered']);

function normaliseSiteFrequency(freq: string): string {
  if (VALID_SITE_CHECKLIST_FREQUENCIES.has(freq)) return freq;
  if (freq === 'quarterly') return 'monthly';
  if (freq === 'once') return 'triggered';
  return 'triggered'; // fallback unknown → ad-hoc
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

// DELETE — Remove all trail_import tagged templates for a company
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const { company_id } = await request.json();
    if (!company_id) {
      return NextResponse.json({ success: false, error: 'Missing company_id' }, { status: 400 });
    }

    // Find all trail_import templates for this company
    const { data: templates } = await supabase
      .from('task_templates')
      .select('id')
      .eq('company_id', company_id)
      .contains('tags', ['trail_import']);

    if (!templates || templates.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const templateIds = templates.map(t => t.id);

    // 1. Delete checklist_tasks generated from these templates
    await supabase
      .from('checklist_tasks')
      .delete()
      .in('template_id', templateIds);

    // 2. Delete template_site_assignments
    await supabase
      .from('template_site_assignments')
      .delete()
      .in('template_id', templateIds);

    // 3. Delete site_checklists (FK constraint)
    await supabase
      .from('site_checklists')
      .delete()
      .in('template_id', templateIds);

    // 4. Delete the templates (cascades to template_fields + template_repeatable_labels)
    const { error } = await supabase
      .from('task_templates')
      .delete()
      .in('id', templateIds);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: templateIds.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — Import templates from Trail CSV
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body: ImportBody = await request.json();
    const { company_id, site_ids, templates } = body;

    if (!company_id || !site_ids?.length || !templates?.length) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: company_id, site_ids, templates' },
        { status: 400 }
      );
    }

    // Fetch existing templates for this company — check both slug AND name for duplicates
    const { data: existingTemplates } = await supabase
      .from('task_templates')
      .select('slug, name')
      .eq('company_id', company_id);

    const existingSlugs = new Set((existingTemplates || []).map((t: any) => t.slug));
    const existingNames = new Set((existingTemplates || []).map((t: any) => t.name?.toLowerCase().trim()));

    const imported: Array<{ id: string; name: string; slug: string }> = [];
    const linked: Array<{ name: string; templateName: string }> = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const tmpl of templates) {
      try {
        // Skip if a template with the same name already exists
        if (existingNames.has(tmpl.name.toLowerCase().trim())) {
          skipped.push({ name: tmpl.name, reason: 'Template with this name already exists' });
          continue;
        }

        // If matched to a compliance template, link to existing instead of creating new
        if (tmpl.matchedTemplateSlug) {
          // Look up the library template (company-specific or global)
          const { data: libraryTemplate } = await supabase
            .from('task_templates')
            .select('id, name, slug')
            .eq('slug', tmpl.matchedTemplateSlug)
            .or(`company_id.eq.${company_id},company_id.is.null`)
            .limit(1)
            .maybeSingle();

          if (libraryTemplate) {
            // Store site assignments as metadata (no scheduling yet)
            const siteAssignments = site_ids.map(siteId => ({
              template_id: libraryTemplate.id,
              site_id: siteId,
              company_id,
            }));

            const { error: assignError } = await supabase
              .from('template_site_assignments')
              .upsert(siteAssignments, { onConflict: 'template_id,site_id' });

            if (assignError) {
              console.error(`Site assignment for linked template ${tmpl.name}:`, assignError);
            }

            linked.push({ name: tmpl.name, templateName: libraryTemplate.name });
            continue;
          }
          // If library template not found, fall through to normal creation
        }

        // Generate unique slug
        let baseSlug = slugify(tmpl.name);
        let slug = baseSlug;
        let counter = 1;
        while (existingSlugs.has(slug)) {
          slug = `${baseSlug}_${counter}`;
          counter++;
          if (counter > 100) {
            slug = `${baseSlug}_${Date.now()}`;
            break;
          }
        }
        existingSlugs.add(slug);
        existingNames.add(tmpl.name.toLowerCase().trim());

        // Build recurrence_pattern with checklist items
        const recurrencePattern: Record<string, any> = {};
        if (tmpl.checklistItems.length > 0) {
          recurrencePattern.default_checklist_items = tmpl.checklistItems;
        }

        // Derive evidence_types — prefer user override, fallback to auto-detected
        const evidenceTypes = tmpl.overrideEvidenceTypes?.length
          ? tmpl.overrideEvidenceTypes
          : tmpl.detectedFields?.evidenceTypes?.length > 0
            ? tmpl.detectedFields.evidenceTypes
            : ['text_note'];

        // Custom form builder mode — detected fields become the form
        const useCustomFields = evidenceTypes.includes('custom_fields');

        // Insert task_template
        const { data: inserted, error: insertError } = await supabase
          .from('task_templates')
          .insert({
            company_id,
            name: tmpl.name,
            slug,
            category: tmpl.category,
            frequency: tmpl.frequency,
            recurrence_pattern: Object.keys(recurrencePattern).length > 0 ? recurrencePattern : null,
            is_active: true,
            is_template_library: false,
            active: true,
            tags: ['trail_import'],
            evidence_types: evidenceTypes,
            use_custom_fields: useCustomFields,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id, name, slug')
          .single();

        if (insertError) {
          failed.push({ name: tmpl.name, error: insertError.message });
          continue;
        }

        // Insert template_fields (if any detected from CSV record log)
        if (tmpl.detectedFields?.fields?.length > 0) {
          // Map Trail field types to app FieldType enum values
          const TRAIL_FIELD_TYPE_MAP: Record<string, string> = {
            'checkbox': 'yes_no',
          };
          const fieldsToInsert = tmpl.detectedFields.fields.map(f => ({
            template_id: inserted.id,
            field_name: f.field_name,
            field_type: TRAIL_FIELD_TYPE_MAP[f.field_type] || f.field_type,
            label: f.label,
            required: f.required,
            field_order: f.field_order,
            help_text: f.help_text,
            min_value: f.min_value,
            max_value: f.max_value,
            warn_threshold: f.warn_threshold,
            fail_threshold: f.fail_threshold,
            options: f.options,
          }));

          const { error: fieldsError } = await supabase
            .from('template_fields')
            .insert(fieldsToInsert);

          if (fieldsError) {
            console.error(`Fields insert failed for ${tmpl.name}:`, fieldsError);
          }
        }

        // Insert template_repeatable_labels for temperature tasks
        if (tmpl.detectedFields?.repeatableLabels?.length > 0) {
          const labelsToInsert = tmpl.detectedFields.repeatableLabels.map((label, idx) => ({
            template_id: inserted.id,
            label,
            label_value: label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
            is_default: true,
            display_order: idx + 1,
          }));

          const { error: labelsError } = await supabase
            .from('template_repeatable_labels')
            .insert(labelsToInsert);

          if (labelsError) {
            console.error(`Repeatable labels insert failed for ${tmpl.name}:`, labelsError);
          }
        }

        // Store site assignments as metadata (no scheduling yet — user reviews first)
        if (site_ids.length > 0) {
          const siteAssignments = site_ids.map(siteId => ({
            template_id: inserted.id,
            site_id: siteId,
            company_id,
          }));

          const { error: assignError } = await supabase
            .from('template_site_assignments')
            .insert(siteAssignments);

          if (assignError) {
            console.error(`Site assignment metadata for ${tmpl.name}:`, assignError);
          }
        }

        imported.push({ ...inserted });
      } catch (err: any) {
        failed.push({ name: tmpl.name, error: err?.message || 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      linked: linked.length,
      skipped: skipped.length,
      failed: failed.length,
      details: { imported, linked, skipped, failed },
    });
  } catch (error: any) {
    console.error('Error importing Trail templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import templates' },
      { status: 500 }
    );
  }
}
