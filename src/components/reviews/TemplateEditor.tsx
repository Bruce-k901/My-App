'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Users, 
  User, 
  UserCircle,
  FileText,
  Lock,
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Eye,
  Save,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  PenLine
} from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { 
  updateTemplate, 
  addTemplateSection, 
  updateTemplateSection, 
  addTemplateQuestion, 
  updateTemplateQuestion 
} from '@/app/actions/reviews';
import type { ReviewTemplate, ReviewTemplateSection, ReviewTemplateQuestion } from '@/types/reviews';

interface TemplateEditorProps {
  template: ReviewTemplate;
}

// Section mode configuration
const SECTION_MODES = {
  both_answer: {
    icon: Users,
    label: 'Both Answer',
    shortLabel: 'Both',
    description: 'Employee and manager answer the same questions (enables comparison view)',
    color: 'blue',
    bgClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
  employee_only: {
    icon: User,
    label: 'Employee Only',
    shortLabel: 'Employee',
    description: 'Only the employee sees and answers these questions',
    color: 'green',
    bgClass: 'bg-green-500/10 border-green-500/20 text-green-400',
  },
  manager_only: {
    icon: UserCircle,
    label: 'Manager Only',
    shortLabel: 'Manager',
    description: 'Only the manager sees these questions (hidden from employee)',
    color: 'purple',
    bgClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  },
  manager_shared: {
    icon: FileText,
    label: 'Manager Writes, Employee Views',
    shortLabel: 'Shared',
    description: 'Manager answers, employee can see the response after',
    color: 'amber',
    bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  sign_off: {
    icon: PenLine,
    label: 'Sign-off',
    shortLabel: 'Sign-off',
    description: 'Both parties must acknowledge and sign',
    color: 'pink',
    bgClass: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
  },
} as const;

const QUESTION_TYPES = [
  { value: 'text_short', label: 'Short Text', description: 'Single line response' },
  { value: 'text_long', label: 'Long Text', description: 'Multi-line response' },
  { value: 'rating_scale', label: 'Rating Scale', description: '1-5 star rating' },
  { value: 'rating_numeric', label: 'Numeric Scale', description: 'Custom number range' },
  { value: 'yes_no', label: 'Yes / No', description: 'Simple boolean' },
  { value: 'single_choice', label: 'Single Choice', description: 'Select one option' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Select multiple options' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'signature', label: 'Signature', description: 'Digital signature' },
];

export function TemplateEditor({ template: initialTemplate }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [template, setTemplate] = useState(initialTemplate);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);

  // Sort sections by display_order
  const sortedSections = [...(template.sections || [])].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getSectionMode = (section: any): keyof typeof SECTION_MODES => {
    if (section.section_mode) return section.section_mode;
    if (section.completed_by === 'employee') return 'employee_only';
    if (section.completed_by === 'manager') return 'manager_only';
    return 'both_answer';
  };

  const handleSaveTemplate = async (updates: Partial<ReviewTemplate>) => {
    startTransition(async () => {
      try {
        const updated = await updateTemplate(template.id, updates);
        
        // If system template was cloned, redirect to new version
        if (template.is_system_template && updated.id !== template.id) {
          toast.success('Template customized! Redirecting to your version...');
          router.push(`/dashboard/people/reviews/templates/${updated.id}`);
          return;
        }
        
        setTemplate(prev => ({ ...prev, ...updated }));
        toast.success('Template saved');
      } catch (error) {
        console.error('Error saving template:', error);
        toast.error('Failed to save template');
      }
    });
  };

  const handleAddSection = async (mode: keyof typeof SECTION_MODES) => {
    startTransition(async () => {
      try {
        const completedBy = 
          mode === 'employee_only' ? 'employee' :
          mode === 'manager_only' || mode === 'manager_shared' ? 'manager' : 'both';
        
        await addTemplateSection(template.id, {
          title: 'New Section',
          description: '',
          completed_by: completedBy,
          section_mode: mode,
          is_required: mode === 'sign_off',
        });
        
        router.refresh();
        setShowAddSection(false);
        toast.success('Section added');
      } catch (error) {
        toast.error('Failed to add section');
      }
    });
  };

  const handleUpdateSection = async (sectionId: string, updates: Partial<ReviewTemplateSection>) => {
    startTransition(async () => {
      try {
        await updateTemplateSection(sectionId, updates);
        router.refresh();
        toast.success('Section updated');
      } catch (error) {
        toast.error('Failed to update section');
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
        toast.error('Failed to add question');
      }
    });
  };

  const handleUpdateQuestion = async (questionId: string, updates: Partial<ReviewTemplateQuestion>) => {
    startTransition(async () => {
      try {
        await updateTemplateQuestion(questionId, updates);
        router.refresh();
        toast.success('Question updated');
      } catch (error) {
        toast.error('Failed to update question');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {template.is_system_template && (
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
              System Template
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="text-neutral-400 hover:text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/people/reviews/templates/${template.id}/preview`)}
            className="text-neutral-400 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      {/* About This Template */}
      <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EC4899]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-[#EC4899]" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-white">{template.name}</h1>
              <p className="text-neutral-400 text-sm mt-1">
                {template.description || 'No description set'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-400">
                  {template.recommended_duration_minutes || 45} mins
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-400">Manager + Employee</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-400">{sortedSections.length} sections</span>
              </div>
            </div>

            {/* When to use guidance */}
            {(template.rationale) && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-300 mb-1">When to use</h4>
                    <p className="text-sm text-blue-300/70">
                      {template.rationale}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            {(template.instructions) && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-300 mb-1">Tips</h4>
                    <p className="text-sm text-amber-300/70">
                      {template.instructions}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel (collapsed by default) */}
      {showSettings && (
        <TemplateSettings 
          template={template} 
          onSave={handleSaveTemplate}
          isPending={isPending}
        />
      )}

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Sections</h2>
          <span className="text-sm text-neutral-500">{sortedSections.length} sections</span>
        </div>

        {sortedSections.map((section, index) => {
          const mode = getSectionMode(section);
          const modeConfig = SECTION_MODES[mode];
          const ModeIcon = modeConfig.icon;
          const isExpanded = expandedSections.includes(section.id);
          const isLocked = (section as any).is_locked || mode === 'sign_off';
          const questionCount = section.questions?.length || 0;

          return (
            <div
              key={section.id}
              className={`bg-white/[0.02] border rounded-xl overflow-hidden transition-all ${
                isExpanded ? 'border-white/[0.1]' : 'border-white/[0.06]'
              }`}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] text-sm font-medium text-white">
                  {index + 1}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{section.title}</h3>
                    {isLocked && (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${modeConfig.bgClass}`}>
                      <ModeIcon className="w-3 h-3" />
                      {modeConfig.shortLabel}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {questionCount} question{questionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="text-neutral-500">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Expanded Section Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  {/* Section Settings */}
                  <div className="py-4 space-y-4">
                    {/* Section Mode Selector */}
                    {!isLocked && (
                      <div>
                        <label className="text-sm text-neutral-400 mb-2 block">Who completes this section?</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(SECTION_MODES).filter(([key]) => key !== 'sign_off').map(([key, config]) => {
                            const Icon = config.icon;
                            const isSelected = mode === key;
                            return (
                              <button
                                key={key}
                                onClick={() => handleUpdateSection(section.id, { 
                                  section_mode: key as any,
                                  completed_by: key === 'employee_only' ? 'employee' : 
                                               key === 'manager_only' || key === 'manager_shared' ? 'manager' : 'both'
                                })}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                  isSelected 
                                    ? `${config.bgClass} border-current` 
                                    : 'border-white/[0.06] hover:border-white/[0.1] text-neutral-400'
                                }`}
                              >
                                <Icon className="w-4 h-4 mb-1" />
                                <div className="text-xs font-medium">{config.shortLabel}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isLocked && (
                      <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <AlertTriangle className="w-4 h-4" />
                        This section is legally required and cannot be modified
                      </div>
                    )}

                    {/* Section Title & Description */}
                    {!isLocked && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-neutral-400 mb-1 block">Section Title</label>
                          <input
                            type="text"
                            defaultValue={section.title}
                            onBlur={(e) => {
                              if (e.target.value !== section.title) {
                                handleUpdateSection(section.id, { title: e.target.value });
                              }
                            }}
                            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-neutral-400 mb-1 block">Description (optional)</label>
                          <input
                            type="text"
                            defaultValue={section.description || ''}
                            placeholder="Brief description..."
                            onBlur={(e) => {
                              if (e.target.value !== (section.description || '')) {
                                handleUpdateSection(section.id, { description: e.target.value || null });
                              }
                            }}
                            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50 placeholder-neutral-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Questions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <h4 className="text-sm font-medium text-neutral-300">Questions</h4>
                      {!isLocked && (
                        <button
                          onClick={() => handleAddQuestion(section.id)}
                          disabled={isPending}
                          className="text-xs text-[#EC4899] hover:text-[#EC4899]/80 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Question
                        </button>
                      )}
                    </div>

                    {section.questions && section.questions.length > 0 ? (
                      <div className="space-y-2">
                        {section.questions
                          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                          .map((question: any, qIndex: number) => (
                            <QuestionRow
                              key={question.id}
                              question={question}
                              index={qIndex}
                              isLocked={isLocked}
                              onUpdate={handleUpdateQuestion}
                              isPending={isPending}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-neutral-500 text-sm">
                        No questions yet
                        {!isLocked && (
                          <button
                            onClick={() => handleAddQuestion(section.id)}
                            className="block mx-auto mt-2 text-[#EC4899] hover:underline"
                          >
                            Add your first question
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section */}
        <div className="border border-dashed border-white/[0.1] rounded-xl">
          {!showAddSection ? (
            <button
              onClick={() => setShowAddSection(true)}
              className="w-full py-6 flex items-center justify-center gap-2 text-neutral-400 hover:text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Section
            </button>
          ) : (
            <div className="p-6 space-y-4">
              <h4 className="text-sm font-medium text-white text-center">Who will complete this section?</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(SECTION_MODES).filter(([key]) => key !== 'sign_off').map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => handleAddSection(key as keyof typeof SECTION_MODES)}
                      disabled={isPending}
                      className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5 transition-all text-center group"
                    >
                      <div className={`w-10 h-10 rounded-lg ${config.bgClass} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-medium text-white">{config.shortLabel}</div>
                      <div className="text-xs text-neutral-500 mt-1 line-clamp-2">{config.description}</div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAddSection(false)}
                className="w-full py-2 text-sm text-neutral-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Question Row Component
function QuestionRow({ 
  question, 
  index, 
  isLocked, 
  onUpdate, 
  isPending 
}: { 
  question: any; 
  index: number; 
  isLocked: boolean;
  onUpdate: (id: string, updates: any) => void;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.question_text);
  const [editType, setEditType] = useState(question.question_type);

  const handleSave = () => {
    if (editText !== question.question_text || editType !== question.question_type) {
      onUpdate(question.id, { 
        question_text: editText,
        question_type: editType
      });
    }
    setIsEditing(false);
  };

  const questionTypeLabel = QUESTION_TYPES.find(t => t.value === question.question_type)?.label || question.question_type;

  if (isEditing && !isLocked) {
    return (
      <div className="bg-white/[0.03] border border-[#EC4899]/30 rounded-lg p-4 space-y-3">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Question</label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50 resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Answer Type</label>
          <select
            value={editType}
            onChange={(e) => setEditType(e.target.value)}
            className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50"
          >
            {QUESTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-3 py-1.5 text-sm bg-[#EC4899]/20 text-[#EC4899] rounded-lg hover:bg-[#EC4899]/30"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group ${
        !isLocked ? 'hover:border-white/[0.08] cursor-pointer' : ''
      }`}
      onClick={() => !isLocked && setIsEditing(true)}
    >
      <span className="text-xs text-neutral-500 mt-1">Q{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{question.question_text}</p>
        <p className="text-xs text-neutral-500 mt-1">{questionTypeLabel}</p>
      </div>
      {!isLocked && (
        <span className="text-xs text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to edit
        </span>
      )}
    </div>
  );
}

// Template Settings Component
function TemplateSettings({ 
  template, 
  onSave, 
  isPending 
}: { 
  template: ReviewTemplate; 
  onSave: (updates: Partial<ReviewTemplate>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [duration, setDuration] = useState(template.recommended_duration_minutes?.toString() || '45');
  const [whenToUse, setWhenToUse] = useState(template.rationale || '');
  const [tips, setTips] = useState(template.instructions || '');

  const handleSave = () => {
    onSave({
      name,
      description,
      recommended_duration_minutes: parseInt(duration) || 45,
      rationale: whenToUse,
      instructions: tips,
    });
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 space-y-4">
      <h3 className="font-medium text-white">Template Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-neutral-400 mb-1 block">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-400 mb-1 block">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-neutral-400 mb-1 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50 resize-none"
        />
      </div>

      <div>
        <label className="text-sm text-neutral-400 mb-1 block">When to Use</label>
        <textarea
          value={whenToUse}
          onChange={(e) => setWhenToUse(e.target.value)}
          rows={2}
          placeholder="Describe when this template should be used..."
          className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50 resize-none placeholder-neutral-600"
        />
      </div>

      <div>
        <label className="text-sm text-neutral-400 mb-1 block">Tips for Managers</label>
        <textarea
          value={tips}
          onChange={(e) => setTips(e.target.value)}
          rows={2}
          placeholder="Best practices and tips for conducting this review..."
          className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.06] rounded-lg text-white text-sm focus:outline-none focus:border-[#EC4899]/50 resize-none placeholder-neutral-600"
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export default TemplateEditor;


