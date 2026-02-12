'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, BarChart3, Filter } from '@/components/ui/icons';
import { ReviewComparisonQuestion } from './ReviewComparisonQuestion';
import type { ReviewWithDetails, ReviewResponse } from '@/types/reviews';

interface ReviewComparisonViewProps {
  review: ReviewWithDetails;
  employeeResponses: ReviewResponse[];
  managerResponses: ReviewResponse[];
}

type FilterType = 'all' | 'aligned' | 'gaps-only';

export function ReviewComparisonView({
  review,
  employeeResponses,
  managerResponses,
}: ReviewComparisonViewProps) {
  // Memoize responses to prevent unnecessary recalculations
  const memoizedEmployeeResponses = useMemo(() => employeeResponses, [employeeResponses]);
  const memoizedManagerResponses = useMemo(() => managerResponses, [managerResponses]);
  
  // Debug logging - only once on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 ReviewComparisonView - Response counts:', {
        totalResponses: review.responses?.length || 0,
        employeeResponses: memoizedEmployeeResponses.length,
        managerResponses: memoizedManagerResponses.length,
        allResponseTypes: review.responses?.map(r => ({
          id: r.id,
          question_id: r.question_id,
          respondent_type: r.respondent_type,
          has_text: !!r.response_text,
          has_number: r.response_number !== null,
          has_boolean: r.response_boolean !== null,
        })) || [],
        sampleEmployeeResponse: memoizedEmployeeResponses[0] || null,
        sampleManagerResponse: memoizedManagerResponses[0] || null,
      });
    }
  }, [review.responses, memoizedEmployeeResponses, memoizedManagerResponses]);
  
  // Initialize expanded sections only once, don't reset on prop changes
  const [expandedSections, setExpandedSections] = useState<string[]>(() => 
    review.template?.sections?.map(s => s.id) || []
  );
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Only update expanded sections if template structure actually changes
  useEffect(() => {
    const sectionIds = review.template?.sections?.map(s => s.id) || [];
    // Only update if the sections have actually changed (new sections added)
    const newSections = sectionIds.filter(id => !expandedSections.includes(id));
    if (newSections.length > 0) {
      setExpandedSections(prev => [...prev, ...newSections]);
    }
  }, [review.template?.sections, expandedSections]);
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };
  
  // Calculate overall alignment stats
  const calculateStats = () => {
    let aligned = 0;
    let minorGaps = 0;
    let significantGaps = 0;
    let total = 0;
    
    review.template?.sections?.forEach(section => {
      section.questions?.forEach(q => {
        if (q.question_type === 'rating_scale' || q.question_type === 'rating_numeric') {
          const empResp = memoizedEmployeeResponses.find(r => r.question_id === q.id);
          const mgrResp = memoizedManagerResponses.find(r => r.question_id === q.id);
          
          if (empResp?.response_number != null && mgrResp?.response_number != null) {
            total++;
            const diff = Math.abs(empResp.response_number - mgrResp.response_number);
            if (diff <= 1) aligned++;
            else if (diff <= 2) minorGaps++;
            else significantGaps++;
          }
        }
      });
    });
    
    return { aligned, minorGaps, significantGaps, total };
  };
  
  const stats = calculateStats();
  
  const shouldShowQuestion = (questionId: string) => {
    if (filter === 'all') return true;
    
    const empResp = memoizedEmployeeResponses.find(r => r.question_id === questionId);
    const mgrResp = memoizedManagerResponses.find(r => r.question_id === questionId);
    
    if (empResp?.response_number == null || mgrResp?.response_number == null) {
      return filter === 'gaps-only'; // Show incomplete as gaps
    }
    
    const diff = Math.abs(empResp.response_number - mgrResp.response_number);
    
    if (filter === 'aligned') return diff <= 1;
    if (filter === 'gaps-only') return diff > 1;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="bg-theme-surface border border-theme rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-module-fg" />
            <h3 className="font-medium text-theme-primary">Alignment Overview</h3>
          </div>
          
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-theme-tertiary" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="w-full px-4 py-2 bg-theme-surface border border-theme rounded-md text-theme-primary focus:outline-none focus:ring-2 focus:ring-module-fg/50"
            >
              <option value="all">Show All</option>
              <option value="aligned">Aligned Only</option>
              <option value="gaps-only">Gaps Only</option>
            </select>
          </div>
        </div>
        
        {stats.total > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-100 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.aligned}</div>
              <div className="text-xs text-green-600/70 dark:text-green-400/70">Aligned</div>
            </div>
            <div className="text-center p-3 bg-amber-100 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.minorGaps}</div>
              <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Minor Gaps</div>
            </div>
            <div className="text-center p-3 bg-red-100 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.significantGaps}</div>
              <div className="text-xs text-red-600/70 dark:text-red-400/70">Discuss</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-theme-tertiary">
            Complete rating questions to see alignment stats
          </p>
        )}
      </div>
      
      {/* Sections */}
      <div className="space-y-4">
        {review.template?.sections?.map((section, sectionIndex) => {
          const isExpanded = expandedSections.includes(section.id);
          const visibleQuestions = section.questions?.filter(q => shouldShowQuestion(q.id)) || [];
          
          if (filter !== 'all' && visibleQuestions.length === 0) return null;
          
          return (
            <div key={section.id} className="bg-theme-surface border border-theme rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 hover:bg-theme-hover transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-theme-button text-sm font-medium text-theme-primary">
                    {sectionIndex + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-theme-primary">{section.title}</h3>
                    {section.description && (
                      <p className="text-sm text-theme-tertiary mt-0.5">{section.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-theme-tertiary">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-theme pt-6 space-y-4">
                  {visibleQuestions.map((question, qIndex) => (
                    <ReviewComparisonQuestion
                      key={question.id}
                      question={question}
                      questionNumber={qIndex + 1}
                      employeeResponse={memoizedEmployeeResponses.find(r => r.question_id === question.id)}
                      managerResponse={memoizedManagerResponses.find(r => r.question_id === question.id)}
                    />
                  ))}
                  
                  {visibleQuestions.length === 0 && (
                    <p className="text-sm text-theme-tertiary text-center py-4">
                      No questions match the current filter
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReviewComparisonView;

