/**
 * Fire RA — Task Generation
 * Creates/links checklist_tasks from Fire RA action items
 */

import { supabase } from '@/lib/supabase';
import { extractActionItems } from './utils';
import type { FireRAAssessmentData, FireRATaskPreview } from '@/types/fire-ra';

// ---------------------------------------------------------------------------
// Preview tasks (for review modal before creation)
// ---------------------------------------------------------------------------

export async function previewTasks(
  assessmentData: FireRAAssessmentData,
  companyId: string
): Promise<FireRATaskPreview[]> {
  const actionItems = extractActionItems(assessmentData);
  if (actionItems.length === 0) return [];

  // Try to find existing matching tasks
  let existingTasks: any[] = [];
  try {
    const { data } = await supabase
      .from('checklist_tasks')
      .select('id, custom_name, status, task_data')
      .eq('company_id', companyId)
      .neq('status', 'completed')
      .limit(200);
    existingTasks = data || [];
  } catch {
    // Ignore — fuzzy matching is optional
  }

  return actionItems.map(item => {
    const taskName = `Fire RA: ${item.sectionName} - ${item.itemName.slice(0, 60)}`;

    // Simple fuzzy match: check if any existing task name contains key words
    const keywords = item.itemName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const match = existingTasks.find(t => {
      const name = (t.custom_name || '').toLowerCase();
      return keywords.some(kw => name.includes(kw)) &&
        (t.task_data?.source_type === 'fire_ra' || name.includes('fire'));
    });

    return {
      itemId: item.id,
      sectionNumber: item.sectionNumber,
      sectionName: item.sectionName,
      itemNumber: item.itemNumber,
      itemName: item.itemName,
      taskName,
      description: item.actionRequired,
      priority: item.priority || 'medium',
      dueDate: item.targetDate || '',
      existingMatchId: match?.id || null,
      existingMatchName: match?.custom_name || null,
      selected: true,
      linkToExisting: !!match,
    };
  });
}

// ---------------------------------------------------------------------------
// Create tasks from confirmed preview
// ---------------------------------------------------------------------------

interface GenerateTasksResult {
  created: number;
  linked: number;
  taskLinks: Record<string, string>; // itemId -> taskId
}

export async function generateTasks(
  previews: FireRATaskPreview[],
  raId: string,
  companyId: string,
  siteId: string | null
): Promise<GenerateTasksResult> {
  const selected = previews.filter(p => p.selected);
  const result: GenerateTasksResult = { created: 0, linked: 0, taskLinks: {} };

  for (const preview of selected) {
    if (preview.linkToExisting && preview.existingMatchId) {
      // Link to existing task
      result.taskLinks[preview.itemId] = preview.existingMatchId;
      result.linked++;
      continue;
    }

    // Create new task
    const priorityMap: Record<string, string> = {
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    try {
      const { data: task, error } = await supabase
        .from('checklist_tasks')
        .insert({
          template_id: null,
          company_id: companyId,
          site_id: siteId || null,
          due_date: preview.dueDate || new Date().toISOString().split('T')[0],
          due_time: '09:00',
          daypart: 'anytime',
          assigned_to_role: 'manager',
          status: 'pending',
          priority: priorityMap[preview.priority] || 'medium',
          custom_name: preview.taskName,
          custom_instructions: preview.description,
          task_data: {
            source_type: 'fire_ra',
            fire_ra_id: raId,
            section_number: preview.sectionNumber,
            item_number: preview.itemNumber,
            created_via: 'fire_ra',
          },
          generated_at: new Date().toISOString(),
        } as any)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create task for item', preview.itemId, error);
        continue;
      }

      if (task) {
        result.taskLinks[preview.itemId] = task.id;
        result.created++;
      }
    } catch (err) {
      console.error('Task creation error:', err);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Update assessment_data with task links after generation
// ---------------------------------------------------------------------------

export function applyTaskLinks(
  assessmentData: FireRAAssessmentData,
  taskLinks: Record<string, string>
): FireRAAssessmentData {
  return {
    ...assessmentData,
    sections: assessmentData.sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        linkedTaskId: taskLinks[item.id] || item.linkedTaskId,
      })),
    })),
  };
}
