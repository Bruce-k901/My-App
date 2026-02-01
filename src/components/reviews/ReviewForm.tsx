'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Circle, Clock, Save, Send, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { ReviewFormSection } from './ReviewFormSection';
import { saveResponses, updateReviewStatus, signOffReview } from '@/app/actions/reviews';
import type { ReviewWithDetails, ReviewResponse, SaveResponseInput } from '@/types/reviews';
import { isDisciplinaryTemplate } from '@/lib/reviews-utils';

interface ReviewFormProps {
  review: ReviewWithDetails;
  currentUserId: string;
  isEmployee: boolean;
  isManager: boolean;
}

export function ReviewForm({ review, currentUserId, isEmployee, isManager }: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // All hooks must be called before any conditional returns
  const [localResponses, setLocalResponses] = useState<Record<string, Partial<SaveResponseInput>>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(
    review.template?.sections?.map(s => s.id) || []
  );

  // Handle missing template gracefully
  if (!review.template || !review.template_id) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-amber-200 mb-1">Template Not Attached</h3>
            <p className="text-sm text-amber-300/80">
              {isManager
                ? 'This review does not have a template attached. Please attach a template to proceed.'
                : 'Your manager is still setting up the review template. Please check back later.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress based on visible sections and current user's responses only
  const expectedRespondentType = isEmployee ? 'employee' : 'manager';
  
  // Filter visible sections (same logic as in render)
  const visibleSections = review.template?.sections?.filter(section => {
    const mode = (section as any).section_mode || 
      (section.completed_by === 'both' ? 'both_answer' :
       section.completed_by === 'employee' ? 'employee_only' :
       section.completed_by === 'manager' ? 'manager_only' : 'both_answer');
    
    if (isEmployee) {
      if (mode === 'manager_only') return false;
      return true;
    }
    
    if (isManager) {
      return true;
    }
    
    return false;
  }) || [];

  // Count total questions in visible sections
  const totalQuestions = visibleSections.reduce(
    (acc, section) => acc + (section.questions?.length || 0), 0
  );

  // Count only responses for current user's respondent_type in visible sections
  const visibleQuestionIds = new Set(
    visibleSections.flatMap(section => 
      (section.questions || []).map(q => q.id)
    )
  );

  const answeredQuestions = (review.responses || []).filter(r => {
    const matchesQuestion = visibleQuestionIds.has(r.question_id);
    const matchesRespondent = (r.respondent_type || '').toLowerCase() === (expectedRespondentType || '').toLowerCase();
    return matchesQuestion && matchesRespondent;
  }).length;

  const progress = totalQuestions > 0 ? Math.min((answeredQuestions / totalQuestions) * 100, 100) : 0;

  const handleResponseChange = (questionId: string, value: Partial<SaveResponseInput>) => {
    setLocalResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...value, question_id: questionId }
    }));
  };

  const handleSave = async () => {
    const responsesToSave = Object.values(localResponses).filter(r => r.question_id);
    if (responsesToSave.length === 0) {
      toast.info('No changes to save');
      return;
    }

    startTransition(async () => {
      try {
        await saveResponses(
          review.id,
          responsesToSave.map(r => ({
            question_id: r.question_id!,
            respondent: isEmployee ? 'employee' : 'manager',
            response_text: r.response_text,
            response_number: r.response_number,
            response_boolean: r.response_boolean,
            response_date: r.response_date,
            response_json: r.response_json,
            behavior_tier_selected: r.behavior_tier_selected,
            behavior_example: r.behavior_example,
          }))
        );
        setLocalResponses({});
        toast.success('Responses saved');
        // Refresh the page data
        router.refresh();
      } catch (error) {
        console.error('Error saving responses:', error);
        toast.error('Failed to save responses');
      }
    });
  };

  const handleSubmit = async () => {
    if (Object.keys(localResponses).length > 0) await handleSave();
    const newStatus = isEmployee ? 'employee_complete' : 'manager_complete';
    startTransition(async () => {
      try {
        await updateReviewStatus(review.id, newStatus);
        toast.success('Section submitted successfully');
        router.refresh();
      } catch (error) {
        console.error('Error submitting section:', error);
        toast.error('Failed to submit section');
      }
    });
  };

  const handleSignOff = async () => {
    startTransition(async () => {
      try {
        await signOffReview(review.id, isEmployee ? 'employee' : 'manager');
        toast.success('Review signed off');
        router.refresh();
      } catch (error) {
        console.error('Error signing off:', error);
        toast.error('Failed to sign off');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/people/reviews">
          <Button variant="ghost" className="text-gray-500 dark:text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        </Link>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center text-white text-lg font-medium">
              {review.employee?.avatar_url ? (
                <img src={review.employee.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                review.employee?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{review.template?.name || review.title}</h1>
              <p className="text-gray-500 dark:text-white/60">{review.employee?.full_name} • {review.employee?.position_title}</p>
              {review.review_period_start && review.review_period_end && (
                <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Review Period: {new Date(review.review_period_start).toLocaleDateString()} - {new Date(review.review_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={review.status} />
            {review.manager && (
              <span className="text-sm text-gray-500 dark:text-white/60 flex items-center gap-1">
                <User className="h-3 w-3" />Manager: {review.manager.full_name}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-white/60">Progress</span>
            <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#EC4899] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">{answeredQuestions} of {totalQuestions} questions answered</p>
        </div>
      </div>

      {review.template?.instructions && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-200">Instructions</h3>
              <p className="text-sm text-blue-300/80 mt-1">{review.template.instructions}</p>
            </div>
          </div>
        </div>
      )}

      {isDisciplinaryTemplate(review.template?.template_type || '') && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-200">Confidential HR Process</h3>
              <p className="text-sm text-red-300/80 mt-1">
                This document contains sensitive employee information. Handle in accordance 
                with data protection policies and ACAS guidelines. Do not share without 
                appropriate authorization.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(() => {
          // Filter sections based on section_mode and user role
          const visibleSections = review.template?.sections?.filter(section => {
            // Use section_mode if available, otherwise fall back to completed_by for backward compatibility
            const mode = (section as any).section_mode || 
              (section.completed_by === 'both' ? 'both_answer' :
               section.completed_by === 'employee' ? 'employee_only' :
               section.completed_by === 'manager' ? 'manager_only' : 'both_answer');
            
            if (isEmployee) {
              // Employee can see: both_answer, employee_only, manager_shared (read-only), sign_off
              if (mode === 'manager_only') return false;
              return true;
            }
            
            if (isManager) {
              // Manager can see all sections
              return true;
            }
            
            return false;
          }) || [];

          return visibleSections.map((section, index) => {
            const sectionQuestions = section.questions || [];
            const expectedRespondentType = isEmployee ? 'employee' : 'manager';
            const sectionResponses = review.responses?.filter(r => {
              const matchesQuestion = sectionQuestions.some(q => q.id === r.question_id);
              const matchesRespondent = (r.respondent_type || '').toLowerCase() === (expectedRespondentType || '').toLowerCase();
              return matchesQuestion && matchesRespondent;
            }) || [];
            
            // Debug logging
            if (process.env.NODE_ENV === 'development' && sectionResponses.length === 0 && sectionQuestions.length > 0) {
              const allResponsesForSection = review.responses?.filter(r => 
                sectionQuestions.some(q => q.id === r.question_id)
              ) || [];
              if (allResponsesForSection.length > 0) {
                console.log(`⚠️ Section "${section.title}" has responses but none match respondent_type "${expectedRespondentType}":`, {
                  sectionId: section.id,
                  expectedRespondentType,
                  availableResponses: allResponsesForSection.map(r => ({
                    id: r.id,
                    question_id: r.question_id,
                    respondent_type: r.respondent_type,
                    respondent_id: r.respondent_id,
                  })),
                });
              }
            }
            const sectionComplete = sectionResponses.length === sectionQuestions.length && sectionQuestions.length > 0;
            
            // Determine section mode (with fallback)
            const sectionMode = (section as any).section_mode || 
              (section.completed_by === 'both' ? 'both_answer' :
               section.completed_by === 'employee' ? 'employee_only' :
               section.completed_by === 'manager' ? 'manager_only' : 'both_answer');
            
            // Check if section should be read-only for employee
            const isReadOnlySection = isEmployee && 
              (sectionMode === 'manager_shared' || sectionMode === 'sign_off');

            const isExpanded = expandedSections.includes(section.id);

            return (
            <div key={section.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  if (isExpanded) {
                    setExpandedSections(expandedSections.filter(id => id !== section.id));
                  } else {
                    setExpandedSections([...expandedSections, section.id]);
                  }
                }}
                className="w-full px-6 py-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] text-sm font-medium text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-white">{section.title}</h3>
                      {/* Section Mode Badges */}
                      {sectionMode === 'manager_only' && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                          👤 Manager Only
                        </span>
                      )}
                      {sectionMode === 'manager_shared' && isEmployee && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                          📄 View Only
                        </span>
                      )}
                      {sectionMode === 'employee_only' && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30">
                          🙋 Your Response
                        </span>
                      )}
                      {sectionMode === 'both_answer' && (
                        <span className="text-xs bg-neutral-500/20 text-gray-500 dark:text-white/60 px-2 py-0.5 rounded border border-neutral-500/30">
                          👥 Both Answer
                        </span>
                      )}
                      {sectionMode === 'sign_off' && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                          ✍️ Sign-off
                        </span>
                      )}
                    </div>
                    {section.description && <p className="text-sm text-gray-500 dark:text-white/60 mt-0.5">{section.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionComplete ? (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/30 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />Complete
                      </span>
                    ) : sectionResponses.length > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs border border-amber-500/30 flex items-center gap-1">
                        <Clock className="h-3 w-3" />In Progress
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-white/[0.05] text-gray-500 dark:text-white/60 rounded text-xs border border-white/[0.06] flex items-center gap-1">
                        <Circle className="h-3 w-3" />Not Started
                      </span>
                    )}
                    <span className="text-xs text-neutral-500">{sectionResponses.length}/{sectionQuestions.length}</span>
                  </div>
                </div>
                <span className="text-neutral-500 ml-4">
                  {isExpanded ? '−' : '+'}
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-white/[0.06] pt-6">
                  {section.instructions && (
                    <p className="text-sm text-gray-500 dark:text-white/60 mb-6 p-3 bg-white/[0.02] rounded-lg">{section.instructions}</p>
                  )}
                  <ReviewFormSection
                    section={section}
                    responses={review.responses || []}
                    localResponses={localResponses}
                    onResponseChange={handleResponseChange}
                    disabled={review.status === 'completed' || isReadOnlySection}
                    readOnly={isReadOnlySection}
                    respondentType={isEmployee ? 'employee' : 'manager'}
                  />
                </div>
              )}
            </div>
            );
          });
        })()}
      </div>

      {review.status !== 'completed' && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 sticky bottom-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-white/60">
              {Object.keys(localResponses).length > 0 && (
                <span className="text-amber-400">{Object.keys(localResponses).length} unsaved changes</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isPending || Object.keys(localResponses).length === 0}>
                <Save className="h-4 w-4 mr-2" />Save Draft
              </Button>
              <Button variant="primary" onClick={handleSubmit} disabled={isPending} className="bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]">
                <Send className="h-4 w-4 mr-2" />Submit {isEmployee ? 'Employee' : 'Manager'} Section
              </Button>
            </div>
          </div>
        </div>
      )}

      {review.status === 'pending_sign_off' && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6">
          <h3 className="font-medium text-white mb-2">Sign Off</h3>
          <p className="text-sm text-gray-500 dark:text-white/60 mb-4">Review the responses above and sign off to complete this review.</p>
          <div className="flex items-center justify-between">
            <div>
              {review.employee_signed_off && (
                <p className="text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />Employee signed off on {new Date(review.employee_signed_at!).toLocaleString()}
                </p>
              )}
              {review.manager_signed_off && (
                <p className="text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />Manager signed off on {new Date(review.manager_signed_at!).toLocaleString()}
                </p>
              )}
            </div>
            <Button 
              variant="primary" 
              onClick={handleSignOff}
              disabled={isPending || (isEmployee && review.employee_signed_off) || (isManager && review.manager_signed_off)}
              className="bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30"
            >
              <CheckCircle className="h-4 w-4 mr-2" />Sign Off
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-white/[0.05] text-gray-500 dark:text-white/60' },
    employee_in_progress: { label: 'Employee In Progress', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    employee_complete: { label: 'Employee Complete', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    manager_in_progress: { label: 'Manager In Progress', className: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    manager_complete: { label: 'Manager Complete', className: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
    pending_sign_off: { label: 'Pending Sign-off', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
    completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
    cancelled: { label: 'Cancelled', className: 'bg-white/[0.05] text-gray-500 dark:text-white/60' },
  };
  const config = configs[status] || configs.draft;
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${config.className}`}>
      {config.label}
    </span>
  );
}
