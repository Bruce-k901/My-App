'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import type {
  ReviewTemplate,
  ReviewTemplateSection,
  ReviewTemplateQuestion,
  Review,
  ReviewResponse,
  EmployeeReviewSchedule,
  ReviewFollowUp,
  ReviewNote,
  CompanyValue,
  ScoringScale,
  EmployeeReviewSummary,
  CreateReviewInput,
  CreateReviewScheduleInput,
  SaveResponseInput,
  CreateFollowUpInput,
  CreateNoteInput,
  ReviewWithDetails,
  EmployeeFileData,
} from '@/types/reviews';

// ============================================================================
// HELPER: Get current user's profile
// ============================================================================

export async function getCurrentProfile() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }
    
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    return profile;
  } catch (error) {
    console.error('Error in getCurrentProfile:', error);
    throw error;
  }
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function getTemplates(): Promise<ReviewTemplate[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    const { data, error } = await supabase
      .from('review_templates')
      .select(`
        *,
        sections:review_template_sections(
          *,
          questions:review_template_questions(*)
        )
      `)
      .or(`is_system_template.eq.true,company_id.eq.${profile.company_id}`)
      .eq('is_active', true)
      .order('name');
      
    if (error) {
      console.error('Error fetching templates:', error);
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Review templates table may not exist yet. Run the migration first.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error in getTemplates:', error);
    return [];
  }
}

export async function getTemplate(templateId: string): Promise<ReviewTemplate | null> {
  try {
    // Validate templateId is a valid UUID format
    if (!templateId || typeof templateId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId)) {
      console.error('Invalid template ID format:', templateId);
      return null;
    }

    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    // Build the query - handle case where company_id might be null
    let query = supabase
      .from('review_templates')
      .select(`
        *,
        sections:review_template_sections(
          *,
          questions:review_template_questions(*)
        )
      `)
      .eq('id', templateId);
    
    // Only add company filter if company_id exists
    if (profile.company_id) {
      query = query.or(`is_system_template.eq.true,company_id.eq.${profile.company_id}`);
    } else {
      // If no company_id, only show system templates
      query = query.eq('is_system_template', true);
    }
    
    const { data, error } = await query.single();
      
    if (error) {
      // Log detailed error information
      console.error('Error fetching template:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        templateId,
      });
      
      // If template not found or access denied, return null
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return null;
      }
      
      // For RLS errors, try fetching without relationships
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.warn('RLS error, trying to fetch template without relationships');
        let simpleQuery = supabase
          .from('review_templates')
          .select('*')
          .eq('id', templateId);
        
        if (profile.company_id) {
          simpleQuery = simpleQuery.or(`is_system_template.eq.true,company_id.eq.${profile.company_id}`);
        } else {
          simpleQuery = simpleQuery.eq('is_system_template', true);
        }
        
        const { data: simpleData, error: simpleError } = await simpleQuery.single();
          
        if (simpleError) {
          console.error('Error fetching template (simple):', simpleError);
          return null;
        }
        
        // Fetch sections and questions separately if we got the template
        if (simpleData) {
          const { data: sections } = await supabase
            .from('review_template_sections')
            .select(`
              *,
              questions:review_template_questions(*)
            `)
            .eq('template_id', templateId)
            .order('order_index');
            
          return {
            ...simpleData,
            sections: sections || [],
          } as ReviewTemplate;
        }
      }
      
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getTemplate:', error);
    return null;
  }
}

export async function cloneTemplate(
  templateId: string,
  newName?: string
): Promise<{ id: string }> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  // Get the template to clone
  const { data: template } = await supabase
    .from('review_templates')
    .select('*')
    .eq('id', templateId)
    .single();
    
  if (!template) throw new Error('Template not found');
  
  // Create new template
  const { data: newTemplate, error: templateError } = await supabase
    .from('review_templates')
    .insert({
      company_id: profile.company_id,
      name: newName || `${template.name} (Copy)`,
      description: template.description,
      template_type: template.template_type,
      instructions: template.instructions,
      rationale: template.rationale,
      expected_outcomes: template.expected_outcomes,
      recommended_duration_minutes: template.recommended_duration_minutes,
      recommended_frequency_days: template.recommended_frequency_days,
      requires_self_assessment: template.requires_self_assessment,
      requires_manager_assessment: template.requires_manager_assessment,
      requires_peer_feedback: template.requires_peer_feedback,
      peer_feedback_count: template.peer_feedback_count,
      scoring_scale_id: template.scoring_scale_id,
      calculate_overall_score: template.calculate_overall_score,
      is_system_template: false,
      is_active: false,
      created_by: profile.id,
    })
    .select()
    .single();
    
  if (templateError) throw templateError;
  
  // Clone sections and questions
  const { data: sections } = await supabase
    .from('review_template_sections')
    .select('*')
    .eq('template_id', templateId)
    .order('display_order');
    
  if (sections) {
    for (const section of sections) {
      const { data: newSection } = await supabase
        .from('review_template_sections')
        .insert({
          template_id: newTemplate.id,
          title: section.title,
          description: section.description,
          instructions: section.instructions,
          completed_by: section.completed_by,
          linked_value_id: section.linked_value_id,
          display_order: section.display_order,
          is_required: section.is_required,
        })
        .select()
        .single();
        
      if (newSection) {
        const { data: questions } = await supabase
          .from('review_template_questions')
          .select('*')
          .eq('section_id', section.id)
          .order('display_order');
          
        if (questions && questions.length > 0) {
          await supabase
            .from('review_template_questions')
            .insert(
              questions.map(q => ({
                section_id: newSection.id,
                question_text: q.question_text,
                question_type: q.question_type,
                helper_text: q.helper_text,
                placeholder_text: q.placeholder_text,
                scoring_scale_id: q.scoring_scale_id,
                min_value: q.min_value,
                max_value: q.max_value,
                min_label: q.min_label,
                max_label: q.max_label,
                options: q.options,
                linked_behavior_id: q.linked_behavior_id,
                is_required: q.is_required,
                min_length: q.min_length,
                max_length: q.max_length,
                min_selections: q.min_selections,
                max_selections: q.max_selections,
                weight: q.weight,
                display_order: q.display_order,
              }))
            );
        }
      }
    }
  }
  
  revalidatePath('/dashboard/people/reviews/templates');
  return { id: newTemplate.id };
}

export async function createTemplate(
  input: Partial<ReviewTemplate>
): Promise<ReviewTemplate> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('review_templates')
    .insert({
      ...input,
      company_id: profile.company_id,
      is_system_template: false,
      created_by: profile.id,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews/templates');
  return data;
}

export async function updateTemplate(
  templateId: string,
  input: Partial<ReviewTemplate>
): Promise<ReviewTemplate> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  // Check if template exists and get current state
  const { data: existingTemplate } = await supabase
    .from('review_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  
  if (!existingTemplate) {
    throw new Error('Template not found');
  }
  
  // If it's a system template, we need to clone it first for the company
  if (existingTemplate.is_system_template && !existingTemplate.company_id) {
    // Check if we already have a clone for this company
    const { data: existingClone } = await supabase
      .from('review_templates')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('cloned_from_id', templateId)
      .maybeSingle();
    
    let templateToUpdate;
    
    if (existingClone) {
      // Use existing clone
      templateToUpdate = existingClone;
    } else {
      // Clone the system template for this company
      const { data: clonedTemplate, error: cloneError } = await supabase
        .from('review_templates')
        .insert({
          company_id: profile.company_id,
          name: existingTemplate.name,
          description: existingTemplate.description,
          template_type: existingTemplate.template_type,
          instructions: existingTemplate.instructions,
          rationale: existingTemplate.rationale,
          expected_outcomes: existingTemplate.expected_outcomes,
          recommended_duration_minutes: existingTemplate.recommended_duration_minutes,
          recommended_frequency_days: existingTemplate.recommended_frequency_days,
          requires_self_assessment: existingTemplate.requires_self_assessment,
          requires_manager_assessment: existingTemplate.requires_manager_assessment,
          scoring_scale_id: existingTemplate.scoring_scale_id,
          calculate_overall_score: existingTemplate.calculate_overall_score,
          is_system_template: false,
          is_active: true,
          cloned_from_id: templateId,
          created_by: profile.id,
        })
        .select()
        .single();
      
      if (cloneError) throw cloneError;
      templateToUpdate = clonedTemplate;
      
      // Clone sections and questions
      const { data: sections } = await supabase
        .from('review_template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');
      
      if (sections && sections.length > 0) {
        for (const section of sections) {
          const { data: newSection } = await supabase
            .from('review_template_sections')
            .insert({
              template_id: clonedTemplate.id,
              title: section.title,
              description: section.description,
              instructions: section.instructions,
              completed_by: section.completed_by,
              linked_value_id: section.linked_value_id,
              display_order: section.display_order,
              is_required: section.is_required,
              is_collapsible: section.is_collapsible,
              starts_collapsed: section.starts_collapsed,
            })
            .select()
            .single();
          
          if (newSection) {
            const { data: questions } = await supabase
              .from('review_template_questions')
              .select('*')
              .eq('section_id', section.id)
              .order('display_order');
            
            if (questions && questions.length > 0) {
              await supabase
                .from('review_template_questions')
                .insert(
                  questions.map((q: any) => ({
                    section_id: newSection.id,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    helper_text: q.helper_text,
                    placeholder_text: q.placeholder_text,
                    scoring_scale_id: q.scoring_scale_id,
                    min_value: q.min_value,
                    max_value: q.max_value,
                    min_label: q.min_label,
                    max_label: q.max_label,
                    options: q.options,
                    linked_behavior_id: q.linked_behavior_id,
                    is_required: q.is_required,
                    min_length: q.min_length,
                    max_length: q.max_length,
                    min_selections: q.min_selections,
                    max_selections: q.max_selections,
                    weight: q.weight,
                    display_order: q.display_order,
                  }))
                );
            }
          }
        }
      }
    }
    
    // Now update the cloned template with the input changes
    const { data, error } = await supabase
      .from('review_templates')
      .update(input)
      .eq('id', templateToUpdate.id)
      .select()
      .single();
      
    if (error) throw error;
    
    revalidatePath('/dashboard/people/reviews/templates');
    revalidatePath(`/dashboard/people/reviews/templates/${templateToUpdate.id}`);
    // Redirect will happen client-side via router.push
    return data;
  }
  
  // Regular update for company templates
  const { data, error } = await supabase
    .from('review_templates')
    .update(input)
    .eq('id', templateId)
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews/templates');
  revalidatePath(`/dashboard/people/reviews/templates/${templateId}`);
  return data;
}

export async function addTemplateSection(
  templateId: string,
  input: Partial<ReviewTemplateSection>
): Promise<ReviewTemplateSection> {
  const supabase = await createServerSupabaseClient();
  
  const { data: sections } = await supabase
    .from('review_template_sections')
    .select('display_order')
    .eq('template_id', templateId)
    .order('display_order', { ascending: false })
    .limit(1);
    
  const nextOrder = (sections?.[0]?.display_order || 0) + 1;
  
  const { data, error } = await supabase
    .from('review_template_sections')
    .insert({
      ...input,
      template_id: templateId,
      display_order: input.display_order ?? nextOrder,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath(`/dashboard/people/reviews/templates/${templateId}`);
  return data;
}

export async function updateTemplateSection(
  sectionId: string,
  input: Partial<ReviewTemplateSection>
): Promise<ReviewTemplateSection> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('review_template_sections')
    .update(input)
    .eq('id', sectionId)
    .select()
    .single();
    
  if (error) throw error;
  
  // Get template_id to revalidate
  const { data: section } = await supabase
    .from('review_template_sections')
    .select('template_id')
    .eq('id', sectionId)
    .single();
    
  if (section?.template_id) {
    revalidatePath(`/dashboard/people/reviews/templates/${section.template_id}`);
  }
  
  return data;
}

export async function addTemplateQuestion(
  sectionId: string,
  input: Partial<ReviewTemplateQuestion>
): Promise<ReviewTemplateQuestion> {
  const supabase = await createServerSupabaseClient();
  
  const { data: questions } = await supabase
    .from('review_template_questions')
    .select('display_order')
    .eq('section_id', sectionId)
    .order('display_order', { ascending: false })
    .limit(1);
    
  const nextOrder = (questions?.[0]?.display_order || 0) + 1;
  
  const { data, error } = await supabase
    .from('review_template_questions')
    .insert({
      ...input,
      section_id: sectionId,
      display_order: input.display_order ?? nextOrder,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Get template_id to revalidate
  const { data: section } = await supabase
    .from('review_template_sections')
    .select('template_id')
    .eq('id', sectionId)
    .single();
    
  if (section?.template_id) {
    revalidatePath(`/dashboard/people/reviews/templates/${section.template_id}`);
  }
  
  return data;
}

export async function updateTemplateQuestion(
  questionId: string,
  input: Partial<ReviewTemplateQuestion>
): Promise<ReviewTemplateQuestion> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('review_template_questions')
    .update(input)
    .eq('id', questionId)
    .select()
    .single();
    
  if (error) throw error;
  
  // Get template_id to revalidate
  const { data: question } = await supabase
    .from('review_template_questions')
    .select('section_id')
    .eq('id', questionId)
    .single();
    
  if (question?.section_id) {
    const { data: section } = await supabase
      .from('review_template_sections')
      .select('template_id')
      .eq('id', question.section_id)
      .single();
      
    if (section?.template_id) {
      revalidatePath(`/dashboard/people/reviews/templates/${section.template_id}`);
    }
  }
  
  return data;
}

// ============================================================================
// SCHEDULING
// ============================================================================

export async function getSchedules(filters?: {
  employee_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}): Promise<EmployeeReviewSchedule[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    let query = supabase
      .from('employee_review_schedules')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('scheduled_date', { ascending: true });
      
    if (filters?.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.from_date) {
      query = query.gte('scheduled_date', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('scheduled_date', filters.to_date);
    }
    
    const { data: schedules, error } = await query;
    if (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
    
    if (!schedules || schedules.length === 0) return [];
    
    // Enrich with related data
    const employeeIds = [...new Set(schedules.map((s: any) => s.employee_id).filter(Boolean))];
    const managerIds = [...new Set(schedules.map((s: any) => s.manager_id).filter(Boolean))];
    const templateIds = [...new Set(schedules.map((s: any) => s.template_id).filter(Boolean))];
    
    const [employeesResult, managersResult, templatesResult] = await Promise.all([
      employeeIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name, avatar_url, position_title')
        .in('id', employeeIds) : { data: [], error: null },
      managerIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', managerIds) : { data: [], error: null },
      templateIds.length > 0 ? supabase
        .from('review_templates')
        .select('id, name, template_type, recommended_duration_minutes')
        .in('id', templateIds) : { data: [], error: null },
    ]);
    
    const employeesMap = new Map((employeesResult.data || []).map((e: any) => [e.id, e]));
    const managersMap = new Map((managersResult.data || []).map((m: any) => [m.id, m]));
    const templatesMap = new Map((templatesResult.data || []).map((t: any) => [t.id, t]));
    
    return schedules.map((schedule: any) => ({
      ...schedule,
      employee: employeesMap.get(schedule.employee_id) || null,
      manager: managersMap.get(schedule.manager_id) || null,
      template: templatesMap.get(schedule.template_id) || null,
    }));
  } catch (error) {
    console.error('Error in getSchedules:', error);
    return [];
  }
}

export async function getMyUpcomingReviews(): Promise<EmployeeReviewSchedule[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    // Fetch schedules first
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_review_schedules')
      .select('*')
      .or(`employee_id.eq.${profile.id},manager_id.eq.${profile.id}`)
      .in('status', ['scheduled', 'invitation_sent', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .limit(10);
      
    if (schedulesError) {
      console.error('Error fetching my upcoming reviews:', schedulesError);
      throw schedulesError;
    }
    
    if (!schedules || schedules.length === 0) return [];
    
    // Enrich with employee and template data
    const employeeIds = [...new Set(schedules.map(s => s.employee_id).filter(Boolean))];
    const templateIds = [...new Set(schedules.map(s => s.template_id).filter(Boolean))];
    
    const [employeesResult, templatesResult] = await Promise.all([
      employeeIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', employeeIds) : { data: [], error: null },
      templateIds.length > 0 ? supabase
        .from('review_templates')
        .select('id, name, template_type')
        .in('id', templateIds) : { data: [], error: null },
    ]);
    
    const employeesMap = new Map((employeesResult.data || []).map((e: any) => [e.id, e]));
    const templatesMap = new Map((templatesResult.data || []).map((t: any) => [t.id, t]));
    
    return schedules.map((schedule: any) => ({
      ...schedule,
      employee: employeesMap.get(schedule.employee_id) || null,
      template: templatesMap.get(schedule.template_id) || null,
    }));
  } catch (error) {
    console.error('Error in getMyUpcomingReviews:', error);
    return [];
  }
}

export async function createSchedule(
  input: CreateReviewScheduleInput
): Promise<EmployeeReviewSchedule> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('employee_review_schedules')
    .insert({
      ...input,
      company_id: profile.company_id,
      status: 'scheduled',
      created_by: profile.id,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews/schedule');
  revalidatePath('/dashboard/people/reviews');
  return data;
}

export async function startReviewFromSchedule(
  scheduleId: string
): Promise<{ reviewId: string }> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  // Get schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('employee_review_schedules')
    .select('*')
    .eq('id', scheduleId)
    .maybeSingle();
    
  if (scheduleError) {
    console.error('Error fetching schedule:', scheduleError);
    throw new Error(`Failed to fetch schedule: ${scheduleError.message}`);
  }
  
  if (!schedule) {
    throw new Error('Schedule not found');
  }
  
  // Check if review already exists for this schedule
  if (schedule.review_id) {
    return { reviewId: schedule.review_id };
  }
  
  // Create review
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      company_id: schedule.company_id,
      schedule_id: schedule.id,
      template_id: schedule.template_id,
      employee_id: schedule.employee_id,
      manager_id: schedule.manager_id,
      status: 'draft',
    })
    .select()
    .single();
    
  if (reviewError) {
    console.error('Error creating review:', reviewError);
    throw new Error(`Failed to create review: ${reviewError.message}`);
  }
  
  if (!review) {
    throw new Error('Review creation returned no data');
  }
  
  // Update schedule
  const { error: updateError } = await supabase
    .from('employee_review_schedules')
    .update({ 
      status: 'in_progress',
      review_id: review.id,
    })
    .eq('id', scheduleId);
  
  if (updateError) {
    console.error('Error updating schedule:', updateError);
    // Don't throw - review was created successfully
  }
  
  // Note: revalidatePath is not called here because this function can be called during render.
  // The page will be revalidated automatically after redirect.
  return { reviewId: review.id };
}

// ============================================================================
// REVIEWS
// ============================================================================

export async function getReviews(filters?: {
  employee_id?: string;
  status?: string;
  template_type?: string;
}): Promise<Review[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    // Fetch reviews first, then enrich
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
      
    if (filters?.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data: reviews, error } = await query;
    if (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
    
    if (!reviews || reviews.length === 0) return [];
    
    // Enrich with employee, manager, and template data
    const employeeIds = [...new Set(reviews.map((r: any) => r.employee_id).filter(Boolean))];
    const managerIds = [...new Set(reviews.map((r: any) => r.manager_id).filter(Boolean))];
    const templateIds = [...new Set(reviews.map((r: any) => r.template_id).filter(Boolean))];
    
    const [employeesResult, managersResult, templatesResult] = await Promise.all([
      employeeIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name, avatar_url, position_title')
        .in('id', employeeIds) : { data: [], error: null },
      managerIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', managerIds) : { data: [], error: null },
      templateIds.length > 0 ? supabase
        .from('review_templates')
        .select('id, name, template_type')
        .in('id', templateIds) : { data: [], error: null },
    ]);
    
    const employeesMap = new Map((employeesResult.data || []).map((e: any) => [e.id, e]));
    const managersMap = new Map((managersResult.data || []).map((m: any) => [m.id, m]));
    const templatesMap = new Map((templatesResult.data || []).map((t: any) => [t.id, t]));
    
    return reviews.map((review: any) => ({
      ...review,
      employee: employeesMap.get(review.employee_id) || null,
      manager: managersMap.get(review.manager_id) || null,
      template: templatesMap.get(review.template_id) || null,
    }));
  } catch (error) {
    console.error('Error in getReviews:', error);
    return [];
  }
}

export async function getReview(reviewId: string): Promise<ReviewWithDetails | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // First get the review with basic relationships
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        *,
        employee:profiles!reviews_employee_id_fkey(*),
        manager:profiles!reviews_manager_id_fkey(*),
        template:review_templates(
          *,
          sections:review_template_sections(
            *,
            questions:review_template_questions(*)
          )
        )
      `)
      .eq('id', reviewId)
      .maybeSingle();
    
    if (reviewError) {
      console.error('Error fetching review:', reviewError);
      return null;
    }
    
    if (!reviewData) {
      return null;
    }
    
    // Fetch related data separately to avoid PostgREST relationship detection issues
    const [responsesResult, notesResult, followUpsResult] = await Promise.all([
      supabase
        .from('review_responses')
        .select('*')
        .eq('review_id', reviewId)
        .order('answered_at', { ascending: true }),
      supabase
        .from('review_notes')
        .select('*')
        .eq('review_id', reviewId),
      supabase
        .from('review_follow_ups')
        .select('*')
        .eq('review_id', reviewId),
    ]);
    
    // Log responses for debugging
    if (responsesResult.data) {
      console.log('📝 Fetched responses:', {
        count: responsesResult.data.length,
        responses: responsesResult.data.map(r => ({
          id: r.id,
          question_id: r.question_id,
          respondent_type: r.respondent_type,
          respondent_id: r.respondent_id,
          has_text: !!r.response_text,
          has_number: r.response_number !== null,
          has_boolean: r.response_boolean !== null,
        })),
      });
    }
    
    if (responsesResult.error) {
      console.error('Error fetching responses:', responsesResult.error);
    }
    
    // Combine the data
    const data = {
      ...reviewData,
      responses: responsesResult.data || [],
      notes: notesResult.data || [],
      follow_ups: followUpsResult.data || [],
    };
    
    const error = reviewError || responsesResult.error || notesResult.error || followUpsResult.error;
    
    if (error) {
      console.error('Error fetching review:', error);
      return null;
    }
    
    return data as ReviewWithDetails;
  } catch (error) {
    console.error('Error in getReview:', error);
    return null;
  }
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      ...input,
      company_id: profile.company_id,
      status: 'draft',
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews');
  return data;
}

export async function updateReviewStatus(
  reviewId: string,
  status: string,
  additionalData?: Partial<Review>
): Promise<Review> {
  const supabase = await createServerSupabaseClient();
  
  const updateData: Partial<Review> = {
    status: status as any,
    ...additionalData,
  };
  
  const now = new Date().toISOString();
  if (status === 'employee_in_progress') {
    updateData.employee_started_at = now;
  } else if (status === 'employee_complete') {
    updateData.employee_completed_at = now;
  } else if (status === 'manager_in_progress') {
    updateData.manager_started_at = now;
  } else if (status === 'manager_complete') {
    updateData.manager_completed_at = now;
  } else if (status === 'completed') {
    updateData.completed_at = now;
  }
  
  const { data, error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews');
  revalidatePath(`/dashboard/people/reviews/${reviewId}`);
  return data;
}

export async function signOffReview(
  reviewId: string,
  role: 'employee' | 'manager',
  signatureText?: string
): Promise<Review> {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();
  
  const updateData: Partial<Review> = role === 'employee'
    ? {
        employee_signed_off: true,
        employee_signed_at: now,
        employee_signature_text: signatureText,
      }
    : {
        manager_signed_off: true,
        manager_signed_at: now,
        manager_signature_text: signatureText,
      };
      
  const { data, error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath(`/dashboard/people/reviews/${reviewId}`);
  return data;
}

// ============================================================================
// RESPONSES
// ============================================================================

export async function saveResponse(input: SaveResponseInput): Promise<ReviewResponse> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { respondent, ...restInput } = input;
  
  const { data, error } = await supabase
    .from('review_responses')
    .upsert(
      {
        ...restInput,
        respondent_type: respondent, // Map respondent to respondent_type
        respondent_id: profile.id,
        answered_at: new Date().toISOString(),
      },
      {
        onConflict: 'review_id,question_id,respondent_type,respondent_id',
      }
    )
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function saveResponses(
  reviewId: string,
  responses: Omit<SaveResponseInput, 'review_id'>[]
): Promise<ReviewResponse[]> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const responsesToSave = responses.map((r) => {
    const { respondent, ...rest } = r;
    return {
      ...rest,
      review_id: reviewId,
      respondent_type: respondent, // Map respondent to respondent_type
      respondent_id: profile.id,
      answered_at: new Date().toISOString(),
    };
  });
  
  // ADD THIS LINE:
  console.log('Attempting to save responses:', JSON.stringify(responsesToSave, null, 2));
  console.log('Profile ID:', profile.id);
  console.log('Review ID:', reviewId);
  
  // Try to check what columns actually exist
  const { data: tableInfo, error: tableInfoError } = await supabase
    .from('review_responses')
    .select('*')
    .limit(0);
  
  if (tableInfoError) {
    console.error('Error checking table structure:', tableInfoError);
  }
  
  // Use upsert to update existing responses or insert new ones
  // Supabase will automatically use the unique constraint: review_id, question_id, respondent_type, respondent_id
  // This ensures we don't lose responses if there's a failure
  const { data, error } = await supabase
    .from('review_responses')
    .upsert(responsesToSave, {
      onConflict: 'review_id,question_id,respondent_type,respondent_id',
    })
    .select();
  
  if (error) {
    console.error('Save error details:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error hint:', error.hint);
    console.error('Error details:', error.details);
    throw error;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Successfully saved responses:', {
      count: data?.length || 0,
      reviewId,
      profileId: profile.id,
      responses: data?.map(r => ({
        id: r.id,
        question_id: r.question_id,
        respondent_type: r.respondent_type,
        respondent_id: r.respondent_id,
        has_text: !!r.response_text,
        has_number: r.response_number !== null,
        has_boolean: r.response_boolean !== null,
        response_text_snippet: r.response_text?.substring(0, 50),
      })) || [],
    });
  }
  
  revalidatePath(`/dashboard/people/reviews/${reviewId}`);
  revalidatePath(`/dashboard/people/reviews`);
  return data || [];
}

// ============================================================================
// FOLLOW-UPS
// ============================================================================

export async function getMyFollowUps(): Promise<ReviewFollowUp[]> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
    const { data, error } = await supabase
      .from('review_follow_ups')
      .select(`
        *,
        review:reviews(
          id,
          employee:profiles(id, full_name)
        )
      `)
      .eq('assigned_to', profile.id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true });
    
  if (error) throw error;
  return data || [];
}

export async function createFollowUp(input: CreateFollowUpInput): Promise<ReviewFollowUp> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('review_follow_ups')
    .insert({
      ...input,
      company_id: profile.company_id,
      assigned_by: profile.id,
      status: 'pending',
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath(`/dashboard/people/reviews/${input.review_id}`);
  return data;
}

export async function updateFollowUpStatus(
  followUpId: string,
  status: string,
  progressNotes?: string
): Promise<ReviewFollowUp> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const updateData: Partial<ReviewFollowUp> = {
    status: status as any,
    progress_notes: progressNotes,
  };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = profile.id;
    updateData.progress_percentage = 100;
  }
  
  const { data, error } = await supabase
    .from('review_follow_ups')
    .update(updateData)
    .eq('id', followUpId)
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews');
  return data;
}

// ============================================================================
// NOTES
// ============================================================================

export async function getReviewNotes(reviewId: string): Promise<ReviewNote[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('review_notes')
    .select(`
      *,
      author:profiles(id, full_name, avatar_url)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
  
  // Map to ReviewNote type and extract phase from metadata
  return (data || []).map((note: any) => ({
    ...note,
    note_text: note.content, // Map content to note_text
    phase: note.metadata?.phase || 'during', // Extract phase from metadata
    author: note.author || null,
  }));
}

export async function addNote(input: CreateNoteInput & { phase?: 'before' | 'during' | 'after'; note_text?: string }): Promise<ReviewNote> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('review_notes')
    .insert({
      review_id: input.review_id,
      note_type: input.note_type || 'general',
      content: input.note_text || input.content || '', // Use note_text or content
      visible_to_employee: input.visible_to_employee ?? true,
      visible_to_manager: input.visible_to_manager ?? true,
      visible_to_hr: input.visible_to_hr ?? true,
      metadata: input.phase ? { phase: input.phase } : (input.metadata || {}),
      author_id: profile.id,
    })
    .select(`
      *,
      author:profiles(id, full_name, avatar_url)
    `)
    .single();
    
  if (error) {
    console.error('Error adding note:', error);
    throw error;
  }
  
  // Map response to ReviewNote type
  const note: ReviewNote = {
    ...data,
    note_text: data.content,
    phase: data.metadata?.phase || 'during',
    author: data.author || null,
  };
  
  revalidatePath(`/dashboard/people/reviews/${input.review_id}`);
  return note;
}

// ============================================================================
// EMPLOYEE FILE
// ============================================================================

export async function getEmployeeFile(employeeId: string): Promise<EmployeeFileData> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data: employee } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', employeeId)
    .eq('company_id', profile.company_id)
    .single();
    
  if (!employee) throw new Error('Employee not found');
  
  const { data: summary } = await supabase
    .from('employee_review_summary')
    .select('*')
    .eq('employee_id', employeeId)
    .single();
    
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      template:review_templates(id, name, template_type)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
    
  const { data: upcoming_schedules } = await supabase
    .from('employee_review_schedules')
    .select(`
      *,
      template:review_templates(id, name, template_type)
    `)
    .eq('employee_id', employeeId)
    .in('status', ['scheduled', 'invitation_sent'])
    .order('scheduled_date', { ascending: true });
    
  const { data: pending_follow_ups } = await supabase
    .from('review_follow_ups')
    .select('*')
    .eq('assigned_to', employeeId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true });
    
  const { data: sickness_records } = await supabase
    .from('staff_sickness_records')
    .select('id, illness_onset_date, symptoms, exclusion_period_start, exclusion_period_end, return_to_work_date, status, medical_clearance_required, medical_clearance_received, rtw_conducted_date, rtw_fit_for_full_duties, rtw_adjustments_needed, rtw_adjustments_details')
    .eq('staff_member_id', employeeId)
    .order('illness_onset_date', { ascending: false });

  const timeline = buildTimeline(reviews || [], upcoming_schedules || [], pending_follow_ups || []);

  return {
    employee,
    summary: summary || null,
    reviews: reviews || [],
    upcoming_schedules: upcoming_schedules || [],
    pending_follow_ups: pending_follow_ups || [],
    timeline,
    sickness_records: sickness_records || [],
  };
}

function buildTimeline(
  reviews: Review[],
  schedules: EmployeeReviewSchedule[],
  followUps: ReviewFollowUp[]
): any[] {
  const events: any[] = [];
  
  reviews
    .filter((r) => r.status === 'completed')
    .forEach((r) => {
      events.push({
        id: r.id,
        type: 'review_completed',
        title: r.title || 'Review Completed',
        description: `Score: ${r.overall_score || 'N/A'}`,
        date: r.completed_at!,
        metadata: r,
      });
    });
    
  schedules.forEach((s) => {
    events.push({
      id: s.id,
      type: 'review_scheduled',
      title: s.title || 'Review Scheduled',
      description: `Due: ${s.due_date || s.scheduled_date}`,
      date: s.scheduled_date,
      metadata: s,
    });
  });
  
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return events;
}

// ============================================================================
// COMPANY VALUES
// ============================================================================

export async function getCompanyValues(): Promise<CompanyValue[]> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('company_values')
    .select(`
      *,
      categories:company_value_categories(
        *,
        behaviors:company_value_behaviors(*)
      )
    `)
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('display_order');
    
  if (error) throw error;
  return data || [];
}

export async function createCompanyValue(
  input: Partial<CompanyValue>
): Promise<CompanyValue> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('company_values')
    .insert({
      ...input,
      company_id: profile.company_id,
      created_by: profile.id,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/people/reviews/settings/values');
  return data;
}

// ============================================================================
// SCORING SCALES
// ============================================================================

export async function getScoringScales(): Promise<ScoringScale[]> {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  const { data, error } = await supabase
    .from('scoring_scales')
    .select(`
      *,
      options:scoring_scale_options(*)
    `)
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .order('name');
    
  if (error) throw error;
  return data || [];
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function getDashboardStats() {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Check if tables exist first - if they don't, return empty stats
    const { error: tableCheckError } = await supabase
      .from('reviews')
      .select('id')
      .limit(1);
    
    if (tableCheckError) {
      const errorMsg = tableCheckError.message || '';
      if (errorMsg.includes('does not exist') || errorMsg.includes('relation') || errorMsg.includes('42P01')) {
        console.warn('⚠️ Review system tables do not exist yet. Please run the migration: supabase/migrations/20250315000001_create_comprehensive_review_system.sql');
        // Return defaults if tables don't exist
        return {
          total_reviews_this_month: 0,
          completed_reviews_this_month: 0,
          overdue_reviews: 0,
          upcoming_reviews_7_days: 0,
          pending_follow_ups: 0,
        };
      }
      // For other errors, log but continue
      console.error('❌ Error checking reviews table:', tableCheckError);
    }
    
    const [
      { count: totalThisMonth, error: totalError },
      { count: completedThisMonth, error: completedError },
      { count: overdue, error: overdueError },
      { count: upcoming7Days, error: upcomingError },
      { count: pendingFollowUps, error: followUpsError },
    ] = await Promise.all([
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .gte('created_at', startOfMonth),
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth),
      supabase
        .from('employee_review_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'overdue'),
      supabase
        .from('employee_review_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .in('status', ['scheduled', 'invitation_sent'])
        .lte('scheduled_date', in7Days),
      supabase
        .from('review_follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .in('status', ['pending', 'in_progress']),
    ]);
    
    // Log errors but don't fail completely
    if (totalError) console.error('Error fetching total reviews:', totalError);
    if (completedError) console.error('Error fetching completed reviews:', completedError);
    if (overdueError) console.error('Error fetching overdue reviews:', overdueError);
    if (upcomingError) console.error('Error fetching upcoming reviews:', upcomingError);
    if (followUpsError) console.error('Error fetching follow-ups:', followUpsError);
    
    return {
      total_reviews_this_month: totalThisMonth || 0,
      completed_reviews_this_month: completedThisMonth || 0,
      overdue_reviews: overdue || 0,
      upcoming_reviews_7_days: upcoming7Days || 0,
      pending_follow_ups: pendingFollowUps || 0,
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    // Return default values on error
    return {
      total_reviews_this_month: 0,
      completed_reviews_this_month: 0,
      overdue_reviews: 0,
      upcoming_reviews_7_days: 0,
      pending_follow_ups: 0,
    };
  }
}

export async function getOverdueReviews() {
  try {
    const supabase = await createServerSupabaseClient();
    const profile = await getCurrentProfile();
    
    // Fetch schedules first
    const { data: schedules, error: schedulesError } = await supabase
      .from('employee_review_schedules')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });
      
    if (schedulesError) {
      console.error('Error fetching overdue reviews:', schedulesError);
      throw schedulesError;
    }
    
    if (!schedules || schedules.length === 0) return [];
    
    // Enrich with employee, manager, and template data
    const employeeIds = [...new Set(schedules.map((s: any) => s.employee_id).filter(Boolean))];
    const managerIds = [...new Set(schedules.map((s: any) => s.manager_id).filter(Boolean))];
    const templateIds = [...new Set(schedules.map((s: any) => s.template_id).filter(Boolean))];
    
    const [employeesResult, managersResult, templatesResult] = await Promise.all([
      employeeIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', employeeIds) : { data: [], error: null },
      managerIds.length > 0 ? supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', managerIds) : { data: [], error: null },
      templateIds.length > 0 ? supabase
        .from('review_templates')
        .select('id, name, template_type')
        .in('id', templateIds) : { data: [], error: null },
    ]);
    
    const employeesMap = new Map((employeesResult.data || []).map((e: any) => [e.id, e]));
    const managersMap = new Map((managersResult.data || []).map((m: any) => [m.id, m]));
    const templatesMap = new Map((templatesResult.data || []).map((t: any) => [t.id, t]));
    
    return schedules.map((schedule: any) => ({
      ...schedule,
      employee: employeesMap.get(schedule.employee_id) || null,
      manager: managersMap.get(schedule.manager_id) || null,
      template: templatesMap.get(schedule.template_id) || null,
    }));
  } catch (error) {
    console.error('Error in getOverdueReviews:', error);
    return [];
  }
}

export async function getEmployeesForReviews(managerId?: string) {
  const supabase = await createServerSupabaseClient();
  const profile = await getCurrentProfile();
  
  let query = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, position_title')
    .eq('company_id', profile.company_id)
    .order('full_name');
    
  if (managerId && profile.app_role?.toLowerCase() !== 'admin' && profile.app_role?.toLowerCase() !== 'owner') {
    query = query.eq('reports_to', managerId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

