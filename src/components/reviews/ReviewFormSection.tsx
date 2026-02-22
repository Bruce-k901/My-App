'use client';

import { ReviewFormQuestion } from './ReviewFormQuestion';
import type { ReviewTemplateSection, ReviewResponse, SaveResponseInput, RespondentType } from '@/types/reviews';

interface ReviewFormSectionProps {
  section: ReviewTemplateSection & { questions?: any[] };
  responses: ReviewResponse[];
  localResponses: Record<string, Partial<SaveResponseInput>>;
  onResponseChange: (questionId: string, value: Partial<SaveResponseInput>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  respondentType: RespondentType;
}

export function ReviewFormSection({
  section, responses, localResponses, onResponseChange, disabled = false, readOnly = false, respondentType,
}: ReviewFormSectionProps) {
  const questions = section.questions || [];
  const sortedQuestions = [...questions].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      {sortedQuestions.map((question, index) => {
        // Find response matching both question_id and respondent_type (case-insensitive)
        const existingResponse = responses.find(r => {
          const matchesQuestion = r.question_id === question.id;
          const matchesRespondent = (r.respondent_type || '').toLowerCase() === (respondentType || '').toLowerCase();
          return matchesQuestion && matchesRespondent;
        });
        
        // Debug logging
        if (process.env.NODE_ENV === 'development' && question.id) {
          const allResponsesForQuestion = responses.filter(r => r.question_id === question.id);
          if (allResponsesForQuestion.length > 0 && !existingResponse) {
            console.log(`⚠️ Question ${question.id} has responses but none match respondent_type "${respondentType}":`, {
              questionId: question.id,
              expectedRespondentType: respondentType,
              availableResponses: allResponsesForQuestion.map(r => ({
                id: r.id,
                respondent_type: r.respondent_type,
                respondent_id: r.respondent_id,
              })),
            });
          }
        }
        
        const localResponse = localResponses[question.id];
        
        if (question.conditional_on_question_id) {
          const dependentResponse = responses.find(r => r.question_id === question.conditional_on_question_id);
          if (!shouldShowQuestion(question, dependentResponse)) return null;
        }

        return (
          <ReviewFormQuestion
            key={question.id}
            question={question}
            questionNumber={index + 1}
            existingResponse={existingResponse}
            localResponse={localResponse}
            onChange={(value) => onResponseChange(question.id, value)}
            disabled={disabled || readOnly}
          />
        );
      })}
    </div>
  );
}

function shouldShowQuestion(question: any, dependentResponse?: ReviewResponse): boolean {
  if (!question.conditional_on_question_id) return true;
  if (!dependentResponse) return false;

  const { conditional_operator, conditional_value } = question;
  const responseValue = dependentResponse.response_text || dependentResponse.response_number?.toString() || dependentResponse.response_boolean?.toString();

  switch (conditional_operator) {
    case 'equals': return responseValue === conditional_value;
    case 'not_equals': return responseValue !== conditional_value;
    case 'greater_than': return Number(responseValue) > Number(conditional_value);
    case 'less_than': return Number(responseValue) < Number(conditional_value);
    case 'contains': return responseValue?.includes(conditional_value) || false;
    case 'is_empty': return !responseValue;
    case 'is_not_empty': return !!responseValue;
    default: return true;
  }
}

