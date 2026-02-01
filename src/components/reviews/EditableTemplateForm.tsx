'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import { toast } from 'sonner';
import { updateTemplate, addTemplateSection, updateTemplateSection, addTemplateQuestion, updateTemplateQuestion } from '@/app/actions/reviews';
import type { ReviewTemplate, ReviewTemplateSection, ReviewTemplateQuestion } from '@/types/reviews';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';

interface EditableTemplateFormProps {
  template: ReviewTemplate;
}

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

export function EditableTemplateForm({ template: initialTemplate }: EditableTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [template, setTemplate] = useState(initialTemplate);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleFieldEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const handleFieldSave = async (field: string) => {
    startTransition(async () => {
      try {
        const updateData: any = {};
        
        // Convert value based on field type
        if (field === 'recommended_duration_minutes' || field === 'recommended_frequency_days') {
          updateData[field] = parseInt(editValue) || null;
        } else if (field === 'requires_self_assessment' || field === 'requires_manager_assessment' || field === 'calculate_overall_score') {
          updateData[field] = editValue === 'true';
        } else {
          updateData[field] = editValue || null;
        }

        const updated = await updateTemplate(template.id, updateData);
        
        // If this was a system template, we got a cloned version - redirect to it
        if (template.is_system_template && updated.id !== template.id) {
          toast.success('Template cloned and updated! Redirecting to your custom version...');
          setTimeout(() => {
            router.push(`/dashboard/people/reviews/templates/${updated.id}`);
          }, 1000);
          return;
        }
        
        setTemplate(updated);
        setEditingField(null);
        toast.success('Template updated');
      } catch (error) {
        console.error('Error updating template:', error);
        toast.error('Failed to update template');
      }
    });
  };

  const handleSectionUpdate = async (sectionId: string, updates: Partial<ReviewTemplateSection>) => {
    startTransition(async () => {
      try {
        await updateTemplateSection(sectionId, updates);
        // Reload template to get updated data
        router.refresh();
        toast.success('Section updated');
      } catch (error) {
        console.error('Error updating section:', error);
        toast.error('Failed to update section');
      }
    });
  };

  const handleQuestionUpdate = async (questionId: string, updates: Partial<ReviewTemplateQuestion>) => {
    startTransition(async () => {
      try {
        await updateTemplateQuestion(questionId, updates);
        router.refresh();
        toast.success('Question updated');
      } catch (error) {
        console.error('Error updating question:', error);
        toast.error('Failed to update question');
      }
    });
  };

  const handleAddSection = async (sectionMode: 'both_answer' | 'employee_only' | 'manager_only' | 'manager_shared' | 'sign_off') => {
    startTransition(async () => {
      try {
        // Get template ID (might be cloned if system template)
        const templateId = template.id;
        
        // Map section_mode to completed_by for backward compatibility
        const completedBy = 
          sectionMode === 'both_answer' ? 'both' :
          sectionMode === 'employee_only' ? 'employee' :
          sectionMode === 'manager_only' ? 'manager' :
          sectionMode === 'manager_shared' ? 'manager' :
          'both'; // sign_off defaults to both
        
        await addTemplateSection(templateId, {
          title: 'New Section',
          description: '',
          completed_by: completedBy,
          section_mode: sectionMode,
          is_required: sectionMode === 'sign_off',
        });
        
        router.refresh();
        toast.success('Section added');
      } catch (error) {
        console.error('Error adding section:', error);
        toast.error('Failed to add section');
      }
    });
  };

  const handleAddQuestion = async (sectionId: string) => {
    startTransition(async () => {
      try {
        await addTemplateQuestion(sectionId, {
          question_text: 'New Question',
          question_type: 'text_short',
          is_required: false,
        });
        
        router.refresh();
        toast.success('Question added');
      } catch (error) {
        console.error('Error adding question:', error);
        toast.error('Failed to add question');
      }
    });
  };

  // Sort sections by display_order
  const sortedSections = (template.sections || []).sort((a: any, b: any) => 
    (a.display_order || 0) - (b.display_order || 0)
  );
  
  // Sort questions within each section
  sortedSections.forEach((section: any) => {
    if (section.questions) {
      section.questions = section.questions.sort((a: any, b: any) => 
        (a.display_order || 0) - (b.display_order || 0)
      );
    }
  });
  
  // Helper to get section mode with fallback
  const getSectionMode = (section: any): string => {
    return section.section_mode || 
      (section.completed_by === 'both' ? 'both_answer' :
       section.completed_by === 'employee' ? 'employee_only' :
       section.completed_by === 'manager' ? 'manager_only' : 'both_answer');
  };
  
  // Helper to get mode icon and label
  const getModeInfo = (mode: string) => {
    const modes: Record<string, { icon: string; label: string; description: string }> = {
      'both_answer': { icon: '👥', label: 'Both Answer', description: 'Employee and manager answer the same questions' },
      'employee_only': { icon: '🙋', label: 'Employee Only', description: 'Only the employee sees and answers' },
      'manager_only': { icon: '👤', label: 'Manager Only', description: 'Only the manager sees (private notes, decisions)' },
      'manager_shared': { icon: '📄', label: 'Share Result', description: 'Manager writes, employee can view after' },
      'sign_off': { icon: '✍️', label: 'Sign-off', description: 'Both must acknowledge and sign' },
    };
    return modes[mode] || modes['both_answer'];
  };

  const [showAddSectionMenu, setShowAddSectionMenu] = useState(false);

  return (
    <div className="space-y-6">
      {/* Template Header */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/people/reviews/templates/${template.id}/preview`)}
              className="bg-transparent border border-white/[0.06] text-white hover:bg-white/[0.05]"
            >
              Preview
            </Button>
            <Button
              onClick={() => {
                toast.success('Template saved');
                router.refresh();
              }}
              className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
            >
              <Save className="h-4 w-4 mr-2" />Save
            </Button>
          </div>
        </div>
      </div>

      {/* About This Template Section */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">📋</span>
          <h2 className="text-lg font-semibold text-white">ABOUT THIS TEMPLATE</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-gray-500 dark:text-white/60 text-sm">When to use:</Label>
            <EditableField
              label=""
              value={template.rationale || 'End of probation period (typically 90 days)'}
              field="rationale"
              editingField={editingField}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              editValue={editValue}
              setEditValue={setEditValue}
              isPending={isPending}
              type="textarea"
            />
          </div>
          <div>
            <Label className="text-gray-500 dark:text-white/60 text-sm">Duration:</Label>
            <EditableField
              label=""
              value={`${template.recommended_duration_minutes || 45}-${(template.recommended_duration_minutes || 45) + 15} minutes`}
              field="recommended_duration_minutes"
              editingField={editingField}
              onEdit={handleFieldEdit}
              onSave={handleFieldSave}
              editValue={editValue}
              setEditValue={setEditValue}
              isPending={isPending}
              type="number"
            />
          </div>
        </div>
        <div className="mb-4">
          <Label className="text-gray-500 dark:text-white/60 text-sm">Participants:</Label>
          <p className="text-white mt-1">Manager + Employee</p>
        </div>
        {template.instructions && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              💡 <strong>Tip:</strong> {template.instructions}
            </p>
          </div>
        )}
      </div>

      {/* Template Header Fields - Collapsed by default */}
      <details className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <summary className="cursor-pointer text-sm text-gray-500 dark:text-white/60 hover:text-white">
          Advanced Settings
        </summary>
        <div className="mt-4 space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Template Name"
            value={template.name}
            field="name"
            editingField={editingField}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
          />
          
          <EditableField
            label="Template Type"
            value={templateTypeLabels[template.template_type] || template.template_type}
            field="template_type"
            editingField={editingField}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="select"
            options={Object.entries(templateTypeLabels).map(([value, label]) => ({ value, label }))}
          />

          <EditableField
            label="Duration (minutes)"
            value={template.recommended_duration_minutes}
            field="recommended_duration_minutes"
            editingField={editingField}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="number"
          />

          <EditableField
            label="Frequency (days)"
            value={template.recommended_frequency_days || 'N/A'}
            field="recommended_frequency_days"
            editingField={editingField}
            onEdit={handleFieldEdit}
            onSave={handleFieldSave}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="number"
          />
        </div>

        <EditableField
          label="Description"
          value={template.description || ''}
          field="description"
          editingField={editingField}
          onEdit={handleFieldEdit}
          onSave={handleFieldSave}
          editValue={editValue}
          setEditValue={setEditValue}
          isPending={isPending}
          type="textarea"
        />

        <EditableField
          label="Instructions"
          value={template.instructions || ''}
          field="instructions"
          editingField={editingField}
          onEdit={handleFieldEdit}
          onSave={handleFieldSave}
          editValue={editValue}
          setEditValue={setEditValue}
          isPending={isPending}
          type="textarea"
        />

        <EditableField
          label="Rationale"
          value={template.rationale || ''}
          field="rationale"
          editingField={editingField}
          onEdit={handleFieldEdit}
          onSave={handleFieldSave}
          editValue={editValue}
          setEditValue={setEditValue}
          isPending={isPending}
          type="textarea"
        />

        <EditableField
          label="Expected Outcomes"
          value={template.expected_outcomes || ''}
          field="expected_outcomes"
          editingField={editingField}
          onEdit={handleFieldEdit}
          onSave={handleFieldSave}
          editValue={editValue}
          setEditValue={setEditValue}
          isPending={isPending}
          type="textarea"
        />
        </div>
      </details>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">SECTIONS</h2>
        </div>

        {/* Section List */}
        {sortedSections.map((section: any, index: number) => {
          const sectionMode = getSectionMode(section);
          const modeInfo = getModeInfo(sectionMode);
          const questionCount = section.questions?.length || 0;
          const isSignOff = sectionMode === 'sign_off';

          return (
            <EditableSection
              key={section.id}
              section={section}
              index={index}
              sectionMode={sectionMode}
              modeInfo={modeInfo}
              onUpdate={handleSectionUpdate}
              onQuestionUpdate={handleQuestionUpdate}
              onAddQuestion={handleAddQuestion}
              isPending={isPending}
            />
          );
        })}

        {/* Add Section Button */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
          <button
            onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
            className="w-full flex items-center justify-center gap-2 py-3 text-[#EC4899] hover:bg-[#EC4899]/10 rounded-lg border border-[#EC4899]/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>

          {showAddSectionMenu && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-500 dark:text-white/60 text-center">Choose who completes this section:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { mode: 'both_answer', icon: '👥', label: 'Both Answer' },
                  { mode: 'manager_only', icon: '👤', label: 'Mgr Only' },
                  { mode: 'employee_only', icon: '🙋', label: 'Emp Only' },
                  { mode: 'manager_shared', icon: '📄', label: 'Share Result' },
                ].map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      handleAddSection(mode as any);
                      setShowAddSectionMenu(false);
                    }}
                    className="p-4 bg-white/[0.05] border border-white/[0.06] rounded-lg hover:border-[#EC4899]/50 hover:bg-[#EC4899]/10 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className="text-sm text-white">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  field,
  editingField,
  onEdit,
  onSave,
  editValue,
  setEditValue,
  isPending,
  type = 'text',
  options,
}: {
  label: string;
  value: any;
  field: string;
  editingField: string | null;
  onEdit: (field: string, value: any) => void;
  onSave: (field: string) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  isPending: boolean;
  type?: 'text' | 'textarea' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
}) {
  const isEditing = editingField === field;

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label className="text-white">{label}</Label>
        {type === 'textarea' ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#EC4899] resize-none"
            rows={4}
          />
        ) : type === 'select' && options ? (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-[#EC4899]"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSave(field)}
            disabled={isPending}
            className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          >
            <Save className="h-3 w-3 mr-1" />Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditValue(String(value));
              onEdit('', '');
            }}
          >
            <X className="h-3 w-3 mr-1" />Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-white">{label}</Label>
        <button
          onClick={() => onEdit(field, value)}
          className="p-1.5 text-[#EC4899] hover:bg-[#EC4899]/10 rounded transition-colors border border-[#EC4899]/30 hover:border-[#EC4899]/50"
          title="Click to edit"
        >
          <Edit className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg">
        <p className="text-neutral-300">{value || 'Not set'}</p>
      </div>
    </div>
  );
}

function SectionGroup({
  title,
  sections,
  completedBy,
  onSectionUpdate,
  onQuestionUpdate,
  onAddSection,
  onAddQuestion,
  isPending,
}: {
  title: string;
  sections: any[];
  completedBy: 'employee' | 'manager' | 'both';
  onSectionUpdate: (id: string, updates: Partial<ReviewTemplateSection>) => void;
  onQuestionUpdate: (id: string, updates: Partial<ReviewTemplateQuestion>) => void;
  onAddSection: (completedBy: 'employee' | 'manager' | 'both') => void;
  onAddQuestion: (sectionId: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <Button
          size="sm"
          onClick={() => onAddSection(completedBy)}
          disabled={isPending}
          className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>
      {sections.length > 0 ? (
        sections.map((section: any, index: number) => (
          <EditableSection
            key={section.id}
            section={section}
            index={index}
            onUpdate={onSectionUpdate}
            onQuestionUpdate={onQuestionUpdate}
            onAddQuestion={onAddQuestion}
            isPending={isPending}
          />
        ))
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-white/60">
          <p>No sections yet. Click "Add Section" to get started.</p>
        </div>
      )}
    </div>
  );
}

function EditableSection({
  section,
  index,
  sectionMode,
  modeInfo,
  onUpdate,
  onQuestionUpdate,
  onAddQuestion,
  isPending,
}: {
  section: any;
  index: number;
  sectionMode: string;
  modeInfo: { icon: string; label: string; description: string };
  onUpdate: (id: string, updates: Partial<ReviewTemplateSection>) => void;
  onQuestionUpdate: (id: string, updates: Partial<ReviewTemplateQuestion>) => void;
  onAddQuestion: (sectionId: string) => void;
  isPending: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const questionCount = section.questions?.length || 0;
  const isSignOff = sectionMode === 'sign_off';

  const handleFieldEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const handleFieldSave = (field: string) => {
    const updates: any = {};
    if (field === 'display_order' || field === 'order_index') {
      updates[field] = parseInt(editValue) || 0;
    } else if (field === 'is_required') {
      updates[field] = editValue === 'true';
    } else {
      updates[field] = editValue || null;
    }
    onUpdate(section.id, updates);
    setEditingField(null);
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] text-sm font-medium text-white">
                {index + 1}
              </div>
              <h3 className="font-medium text-white">{section.title}</h3>
            </div>
            <div className="ml-11 space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/60">
                <span>{modeInfo.icon}</span>
                <span>{modeInfo.label}</span>
                <span className="text-neutral-500">•</span>
                <span>{questionCount} questions</span>
              </div>
              {isSignOff && (
                <p className="text-xs text-amber-400">
                  ⚠️ This section is legally required and cannot be removed
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSignOff && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">
                🔒 Locked
              </span>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-500 dark:text-white/60 hover:text-white"
            >
              {isExpanded ? 'Hide' : 'Edit'} ▾
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-4 space-y-4">
          <EditableField
            label="Section Title"
            value={section.title}
            field={`section-${section.id}-title`}
            editingField={editingField}
            onEdit={() => handleFieldEdit('title', section.title)}
            onSave={() => handleFieldSave('title')}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
          />

          {section.description && (
            <EditableField
              label="Description"
              value={section.description}
              field={`section-${section.id}-description`}
              editingField={editingField}
              onEdit={() => handleFieldEdit('description', section.description)}
              onSave={() => handleFieldSave('description')}
              editValue={editValue}
              setEditValue={setEditValue}
              isPending={isPending}
              type="textarea"
            />
          )}

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-500 dark:text-white/60">Questions</h4>
              <Button
                size="sm"
                onClick={() => onAddQuestion(section.id)}
                disabled={isPending}
                className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Question
              </Button>
            </div>
            {section.questions && section.questions.length > 0 ? (
              section.questions.map((question: any, qIndex: number) => (
                <EditableQuestion
                  key={question.id}
                  question={question}
                  index={qIndex}
                  onUpdate={onQuestionUpdate}
                  isPending={isPending}
                />
              ))
            ) : (
              <p className="text-sm text-neutral-500 italic">No questions yet. Click "Add Question" to add one.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableQuestion({
  question,
  index,
  onUpdate,
  isPending,
}: {
  question: any;
  index: number;
  onUpdate: (id: string, updates: Partial<ReviewTemplateQuestion>) => void;
  isPending: boolean;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleFieldEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    if (field === 'scoring_options' && currentValue) {
      setEditValue(JSON.stringify(currentValue, null, 2));
    } else {
      setEditValue(String(currentValue || ''));
    }
  };

  const handleFieldSave = (field: string) => {
    const updates: any = {};
    if (field === 'scoring_options') {
      try {
        updates[field] = JSON.parse(editValue);
      } catch {
        toast.error('Invalid JSON for scoring options');
        return;
      }
    } else if (field === 'options') {
      // Options is already handled in the specific field handlers
      return;
    } else if (field === 'min_value' || field === 'max_value' || field === 'step_value' || field === 'order_index' || field === 'display_order') {
      updates[field] = editValue ? parseFloat(editValue) : null;
    } else if (field === 'is_required') {
      updates[field] = editValue === 'true';
    } else {
      updates[field] = editValue || null;
    }
    onUpdate(question.id, updates);
    setEditingField(null);
  };

  const isRatingNumeric = question.question_type === 'rating_numeric';

  return (
    <div className="pl-4 border-l-2 border-white/[0.06] space-y-2">
      <div className="flex items-start justify-between group">
        <div className="flex-1">
          <EditableField
            label={`Q${index + 1}: Question Text`}
            value={question.question_text}
            field={`question-${question.id}-text`}
            editingField={editingField}
            onEdit={() => handleFieldEdit('question_text', question.question_text)}
            onSave={() => handleFieldSave('question_text')}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="textarea"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type: {questionTypeLabels[question.question_type] || question.question_type}
          </p>
        </div>
      </div>

      {/* Scoring options for rating_numeric */}
      {isRatingNumeric && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <EditableField
            label="Min Value"
            value={question.options?.min_value || question.min_value || ''}
            field={`question-${question.id}-min_value`}
            editingField={editingField}
            onEdit={() => handleFieldEdit('min_value', question.options?.min_value || question.min_value || '')}
            onSave={() => {
              const currentOptions = question.options || {};
              handleFieldSave('options');
              // Store in options JSONB
              const updates: any = {
                options: {
                  ...currentOptions,
                  min_value: parseFloat(editValue) || 0,
                },
              };
              onUpdate(question.id, updates);
            }}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="number"
          />
          <EditableField
            label="Max Value"
            value={question.options?.max_value || question.max_value || ''}
            field={`question-${question.id}-max_value`}
            editingField={editingField}
            onEdit={() => handleFieldEdit('max_value', question.options?.max_value || question.max_value || '')}
            onSave={() => {
              const currentOptions = question.options || {};
              const updates: any = {
                options: {
                  ...currentOptions,
                  max_value: parseFloat(editValue) || 10,
                },
              };
              onUpdate(question.id, updates);
              setEditingField(null);
            }}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="number"
          />
          <EditableField
            label="Step Value"
            value={question.options?.step_value || question.step_value || ''}
            field={`question-${question.id}-step_value`}
            editingField={editingField}
            onEdit={() => handleFieldEdit('step_value', question.options?.step_value || question.step_value || '')}
            onSave={() => {
              const currentOptions = question.options || {};
              const updates: any = {
                options: {
                  ...currentOptions,
                  step_value: parseFloat(editValue) || 1,
                },
              };
              onUpdate(question.id, updates);
              setEditingField(null);
            }}
            editValue={editValue}
            setEditValue={setEditValue}
            isPending={isPending}
            type="number"
          />
        </div>
      )}

      {question.scoring_options && (
        <EditableField
          label="Scoring Options (JSON)"
          value={JSON.stringify(question.scoring_options, null, 2)}
          field={`question-${question.id}-scoring_options`}
          editingField={editingField}
          onEdit={() => handleFieldEdit('scoring_options', question.scoring_options)}
          onSave={() => handleFieldSave('scoring_options')}
          editValue={editValue}
          setEditValue={setEditValue}
          isPending={isPending}
          type="textarea"
        />
      )}
    </div>
  );
}

