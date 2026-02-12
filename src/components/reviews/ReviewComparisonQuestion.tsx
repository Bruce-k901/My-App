'use client';

import { useState } from 'react';
import { MessageSquare, AlertTriangle, CheckCircle, HelpCircle } from '@/components/ui/icons';
import type { ReviewTemplateQuestion, ReviewResponse } from '@/types/reviews';

interface ReviewComparisonQuestionProps {
  question: ReviewTemplateQuestion;
  questionNumber: number;
  employeeResponse?: ReviewResponse;
  managerResponse?: ReviewResponse;
  showDiscussionPrompts?: boolean;
}

// Helper to calculate alignment for numeric responses
function getAlignment(empScore?: number | null, mgrScore?: number | null): {
  level: 'aligned' | 'minor-gap' | 'significant-gap' | 'unknown';
  difference: number | null;
} {
  if (empScore == null || mgrScore == null) {
    return { level: 'unknown', difference: null };
  }
  const diff = Math.abs(empScore - mgrScore);
  if (diff <= 1) return { level: 'aligned', difference: diff };
  if (diff <= 2) return { level: 'minor-gap', difference: diff };
  return { level: 'significant-gap', difference: diff };
}

// Discussion prompts based on gap type
const DISCUSSION_PROMPTS = {
  'aligned': [
    "Great alignment here! What specific examples support this shared view?",
    "You both agree on this - what contributed to this success?",
  ],
  'minor-gap': [
    "There's a small difference in perception. What examples come to mind for each of you?",
    "Interesting - you're close but not quite aligned. What might explain the difference?",
  ],
  'significant-gap': [
    "There's a notable gap here. Let's explore what's driving each perspective.",
    "This is a great coaching opportunity. What specific situations led to these different views?",
    "Before discussing, can each of you share one specific example that influenced your rating?",
  ],
  'unknown': [
    "One or both responses are missing. Let's discuss this question together.",
  ],
};

export function ReviewComparisonQuestion({
  question,
  questionNumber,
  employeeResponse,
  managerResponse,
  showDiscussionPrompts = true,
}: ReviewComparisonQuestionProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const isRatingQuestion = question.question_type === 'rating_scale' || 
                           question.question_type === 'rating_numeric';
  
  const alignment = isRatingQuestion 
    ? getAlignment(
        employeeResponse?.response_number,
        managerResponse?.response_number
      )
    : { level: 'unknown' as const, difference: null };
  
  const alignmentStyles = {
    'aligned': {
      border: 'border-green-200 dark:border-green-500/30',
      bg: 'bg-green-50 dark:bg-green-500/5',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
      label: 'Aligned',
      labelBg: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
    },
    'minor-gap': {
      border: 'border-amber-200 dark:border-amber-500/30',
      bg: 'bg-amber-50 dark:bg-amber-500/5',
      icon: HelpCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Minor Gap',
      labelBg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    'significant-gap': {
      border: 'border-red-200 dark:border-red-500/30',
      bg: 'bg-red-50 dark:bg-red-500/5',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'Discussion Needed',
      labelBg: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    },
    'unknown': {
      border: 'border-theme',
      bg: 'bg-theme-hover',
      icon: HelpCircle,
      iconColor: 'text-theme-tertiary',
      label: 'Incomplete',
      labelBg: 'bg-theme-button text-theme-tertiary',
    },
  };
  
  const style = alignmentStyles[alignment.level];
  const AlignmentIcon = style.icon;
  
  // Get a random discussion prompt
  const prompts = DISCUSSION_PROMPTS[alignment.level];
  const discussionPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  
  const renderResponse = (response?: ReviewResponse, label?: string) => {
    if (!response) {
      return (
        <div className="text-theme-tertiary italic text-sm">Not yet answered</div>
      );
    }
    
    if (question.question_type === 'rating_scale' || question.question_type === 'rating_numeric') {
      const score = response.response_number;
      const max = question.max_value || 5;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(max)].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                    score && i < score
                      ? 'bg-module-fg border-module-fg text-white'
                      : 'border-theme text-theme-tertiary'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-theme-primary">{score}/{max}</span>
          </div>
          {response.response_text && (
            <p className="text-sm text-theme-tertiary bg-theme-hover rounded p-2">
              "{response.response_text}"
            </p>
          )}
        </div>
      );
    }
    
    if (question.question_type === 'yes_no') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          response.response_boolean
            ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          {response.response_boolean ? 'Yes' : 'No'}
        </div>
      );
    }
    
    // Text response
    return (
      <div className="text-sm text-theme-tertiary bg-theme-hover rounded p-3">
        {response.response_text || <span className="text-theme-tertiary italic">No response</span>}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4 space-y-4`}>
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-theme-tertiary">Q{questionNumber}</span>
            {question.is_required && (
              <span className="text-xs text-red-600 dark:text-red-400">Required</span>
            )}
          </div>
          <h4 className="font-medium text-theme-primary">{question.question_text}</h4>
          {question.helper_text && (
            <p className="text-sm text-theme-tertiary mt-1">{question.helper_text}</p>
          )}
        </div>
        
        {/* Alignment Badge */}
        {isRatingQuestion && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.labelBg}`}>
            <AlignmentIcon className="w-3 h-3" />
            {style.label}
            {alignment.difference !== null && alignment.difference > 0 && (
              <span className="opacity-75">({alignment.difference} pt gap)</span>
            )}
          </div>
        )}
      </div>
      
      {/* Side-by-Side Responses */}
      <div className="grid grid-cols-2 gap-4">
        {/* Employee Response */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">E</span>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Employee</span>
          </div>
          {renderResponse(employeeResponse)}
        </div>
        
        {/* Manager Response */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">M</span>
            </div>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Manager</span>
          </div>
          {renderResponse(managerResponse)}
        </div>
      </div>
      
      {/* Discussion Prompt */}
      {showDiscussionPrompts && (
        <div className="pt-2 border-t border-theme">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-2 text-sm text-theme-tertiary hover:text-theme-primary transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            {showPrompt ? 'Hide' : 'Show'} Discussion Prompt
          </button>
          
          {showPrompt && (
            <div className="mt-3 p-3 bg-module-fg/10 border border-module-fg/20 rounded-lg">
              <p className="text-sm text-module-fg">
                💬 {discussionPrompt}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewComparisonQuestion;

