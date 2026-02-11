import { Suspense } from 'react';
import { getTemplate } from '@/app/actions/reviews';
import { getCurrentProfile } from '@/app/actions/reviews';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { TemplateEditor } from '@/components/reviews/TemplateEditor';

// Mark as dynamic since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Handle both Promise and direct params (Next.js 15 compatibility)
  const resolvedParams = params instanceof Promise ? await params : params;
  
  // Validate the ID
  if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <Suspense fallback={<TemplateDetailSkeleton />}>
        <TemplateDetailContent templateId={resolvedParams.id} />
      </Suspense>
    </div>
  );
}

async function TemplateDetailContent({ templateId }: { templateId: string }) {
  try {
    console.log('🔍 Loading template:', templateId);
    const template = await getTemplate(templateId);
    
    if (!template) {
      console.warn('⚠️ Template not found:', templateId);
      notFound();
    }
    
    console.log('✅ Template loaded:', { 
      id: template.id, 
      name: template.name,
      is_system_template: template.is_system_template,
      sections: template.sections?.length || 0,
    });

    // Check if user is staff - staff cannot edit templates
    let canEdit = true;
    try {
      const profile = await getCurrentProfile();
      const isStaff = profile?.app_role && 
        ['staff', 'employee'].includes((profile.app_role || '').toLowerCase());
      canEdit = !isStaff;
    } catch (error) {
      console.error('Error checking profile:', error);
      // Default to allowing edit if we can't check profile
      canEdit = true;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/people/reviews/templates">
              <Button variant="ghost" className="text-gray-500 dark:text-white/60 hover:text-gray-900 dark:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{template.name}</h1>
              <p className="text-sm text-gray-500 dark:text-white/60 mt-1">{template.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {template.is_system_template ? (
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded text-sm border border-blue-500/30">
                System Template (will be cloned on edit)
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-sm border border-blue-200 dark:border-blue-500/20">
                Custom Template
              </span>
            )}
          </div>
        </div>

        {canEdit ? (
          <TemplateEditor template={template} />
        ) : (
          <ReadOnlyTemplateView template={template} />
        )}
      </div>
    );
  } catch (error) {
    console.error('❌ Error loading template:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      templateId,
    });
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-12 text-center">
        <p className="text-gray-900 dark:text-white font-medium">Error loading template</p>
        <p className="text-gray-500 dark:text-white/60 text-sm mt-1">
          {error instanceof Error ? error.message : 'Please try refreshing the page'}
        </p>
        <p className="text-gray-500 dark:text-white/50 text-xs mt-2">Check the server console for details</p>
      </div>
    );
  }
}

function ReadOnlyTemplateView({ template }: { template: any }) {
  const templateTypeLabels: Record<string, string> = {
    onboarding_check_in: 'Onboarding Check-in',
    probation_review: 'Probation Review',
    one_to_one: '1-2-1',
    monthly_review: 'Monthly Review',
    quarterly_review: 'Quarterly Review',
    annual_appraisal: 'Annual Appraisal',
    values_review: 'Values Review',
    mid_year_review: 'Mid-Year Review',
    performance_improvement: 'Performance Improvement',
    promotion_review: 'Promotion Review',
    exit_interview: 'Exit Interview',
    return_to_work: 'Return to Work',
    custom: 'Custom',
  };

  const questionTypeLabels: Record<string, string> = {
    text_short: 'Short Text',
    text_long: 'Long Text',
    rating_scale: 'Rating Scale',
    rating_numeric: 'Rating Numeric',
    single_choice: 'Single Choice',
    multiple_choice: 'Multiple Choice',
    yes_no: 'Yes/No',
    date: 'Date',
    goal_tracker: 'Goal Tracker',
    value_behavior: 'Value Behavior',
    file_upload: 'File Upload',
    signature: 'Signature',
  };

  // Group sections by completed_by
  const employeeSections = template.sections?.filter((s: any) => s.completed_by === 'employee') || [];
  const managerSections = template.sections?.filter((s: any) => s.completed_by === 'manager') || [];
  const bothSections = template.sections?.filter((s: any) => s.completed_by === 'both') || [];

  return (
    <div className="space-y-6">
      {/* Template Details */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Template Type</h3>
            <p className="text-gray-900 dark:text-white">
              {templateTypeLabels[template.template_type] || 
                template.template_type
                  .split('_')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Duration</h3>
            <p className="text-gray-900 dark:text-white">{template.recommended_duration_minutes} minutes</p>
          </div>
          {template.recommended_frequency_days && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Frequency</h3>
              <p className="text-gray-900 dark:text-white">Every {template.recommended_frequency_days} days</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Total Sections</h3>
            <p className="text-gray-900 dark:text-white">{template.sections?.length || 0} sections</p>
          </div>
        </div>

        {template.instructions && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Instructions</h3>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{template.instructions}</p>
          </div>
        )}

        {template.rationale && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Rationale</h3>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{template.rationale}</p>
          </div>
        )}

        {template.expected_outcomes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-white/60 mb-2">Expected Outcomes</h3>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{template.expected_outcomes}</p>
          </div>
        )}
      </div>

      {/* Sections grouped by assessment type */}
      {template.sections && template.sections.length > 0 && (
        <div className="space-y-6">
          {employeeSections.length > 0 && (
            <SectionGroup
              title="Employee Self-Assessment Sections"
              sections={employeeSections}
              questionTypeLabels={questionTypeLabels}
            />
          )}

          {managerSections.length > 0 && (
            <SectionGroup
              title="Manager Assessment Sections"
              sections={managerSections}
              questionTypeLabels={questionTypeLabels}
            />
          )}

          {bothSections.length > 0 && (
            <SectionGroup
              title="Both Employee & Manager Sections"
              sections={bothSections}
              questionTypeLabels={questionTypeLabels}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SectionGroup({ title, sections, questionTypeLabels }: { title: string; sections: any[]; questionTypeLabels: Record<string, string> }) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {sections.map((section: any, index: number) => (
        <div key={section.id} className="bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.06] rounded-lg p-4">
          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
            {index + 1}. {section.title}
          </h4>
          {section.description && (
            <p className="text-gray-500 dark:text-white/60 text-sm mb-3">{section.description}</p>
          )}
          {section.questions && section.questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Questions ({section.questions.length}):</p>
              {section.questions.map((question: any, qIndex: number) => (
                <div key={question.id} className="pl-4 border-l-2 border-gray-200 dark:border-white/[0.06]">
                  <p className="text-sm text-gray-700 dark:text-white/80">
                    {qIndex + 1}. {question.question_text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                    Type: {questionTypeLabels[question.question_type] || 
                      question.question_type
                        .split('_')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    {question.question_type === 'rating_numeric' && (
                      <span className="ml-2">
                        (
                        {question.options?.min_value ?? question.min_value ?? 0} - 
                        {question.options?.max_value ?? question.max_value ?? 10}
                        {(question.options?.step_value ?? question.step_value) && 
                          `, step: ${question.options?.step_value ?? question.step_value}`}
                        )
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TemplateDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-24 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
        <div>
          <div className="h-8 w-64 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-white/[0.05] rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

