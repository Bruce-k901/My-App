'use client';

import { useState, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import type { ReviewTemplateQuestion, ReviewResponse, SaveResponseInput } from '@/types/reviews';

interface ReviewFormQuestionProps {
  question: ReviewTemplateQuestion;
  questionNumber: number;
  existingResponse?: ReviewResponse;
  localResponse?: Partial<SaveResponseInput>;
  onChange: (value: Partial<SaveResponseInput>) => void;
  disabled?: boolean;
}

export function ReviewFormQuestion({
  question, questionNumber, existingResponse, localResponse, onChange, disabled = false,
}: ReviewFormQuestionProps) {
  const getCurrentValue = () => {
    if (localResponse) return localResponse;
    if (existingResponse) {
      return {
        response_text: existingResponse.response_text,
        response_number: existingResponse.response_number,
        response_boolean: existingResponse.response_boolean,
        response_date: existingResponse.response_date,
        response_json: existingResponse.response_json,
        behavior_tier_selected: existingResponse.behavior_tier_selected,
        behavior_example: existingResponse.behavior_example,
      };
    }
    return {};
  };

  const currentValue = getCurrentValue();

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-neutral-500 text-sm font-medium">{questionNumber}.</span>
        <div className="flex-1">
          <Label className="text-white font-medium">
            {question.question_text}
            {question.is_required && <span className="text-[#EC4899] ml-1">*</span>}
          </Label>
          {question.helper_text && (
            <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />{question.helper_text}
            </p>
          )}
        </div>
      </div>

      <div className="ml-6">
        <QuestionInput
          question={question}
          value={currentValue}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion;
  value: Partial<SaveResponseInput>;
  onChange: (value: Partial<SaveResponseInput>) => void;
  disabled: boolean;
}) {
  switch (question.question_type) {
    case 'text_short':
      return (
        <Input
          placeholder={question.placeholder_text || 'Enter your response...'}
          value={value.response_text || ''}
          onChange={(e) => onChange({ response_text: e.target.value })}
          disabled={disabled}
          maxLength={question.max_length || undefined}
        />
      );

    case 'text_long':
      return (
        <textarea
          placeholder={question.placeholder_text || 'Enter your response...'}
          value={value.response_text || ''}
          onChange={(e) => onChange({ response_text: e.target.value })}
          disabled={disabled}
          className="flex min-h-[120px] w-full rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/50 focus-visible:border-[#EC4899]/50 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
          maxLength={question.max_length || undefined}
        />
      );

    case 'rating_numeric':
      return <RatingNumericInput question={question} value={value.response_number} onChange={(num) => onChange({ response_number: num })} disabled={disabled} />;

    case 'rating_scale':
      return <RatingScaleInput question={question} value={value.response_number} onChange={(num) => onChange({ response_number: num })} disabled={disabled} />;

    case 'single_choice':
      return <SingleChoiceInput question={question} value={value.response_text} onChange={(text) => onChange({ response_text: text })} disabled={disabled} />;

    case 'multiple_choice':
      return <MultipleChoiceInput question={question} value={value.response_json as string[] | undefined} onChange={(arr) => onChange({ response_json: arr as any })} disabled={disabled} />;

    case 'yes_no':
      return <YesNoInput question={question} value={value.response_boolean} onChange={(bool) => onChange({ response_boolean: bool })} disabled={disabled} />;

    case 'date':
      return <DateInput question={question} value={value.response_date} onChange={(date) => onChange({ response_date: date })} disabled={disabled} />;

    case 'value_behavior':
      return <ValueBehaviorInput question={question} tierSelected={value.behavior_tier_selected} example={value.behavior_example} onChange={(tier, example) => onChange({ behavior_tier_selected: tier, behavior_example: example })} disabled={disabled} />;

    case 'signature':
      return <SignatureInput value={value.response_text} onChange={(sig) => onChange({ response_text: sig })} disabled={disabled} />;

    default:
      return <div className="text-neutral-500 text-sm">Unsupported question type: {question.question_type}</div>;
  }
}

// RATING NUMERIC (1-10 slider)
function RatingNumericInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: number | null; onChange: (value: number) => void; disabled: boolean;
}) {
  const min = question.min_value || 1;
  const max = question.max_value || 10;
  const step = question.step || 1;
  const currentValue = value ?? min;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-2xl font-bold text-[#EC4899] w-12 text-center">{currentValue}</span>
      </div>
      {(question.min_label || question.max_label) && (
        <div className="flex justify-between text-sm text-neutral-400">
          <span>{question.min_label || min}</span>
          <span>{question.max_label || max}</span>
        </div>
      )}
    </div>
  );
}

// RATING SCALE (predefined options)
function RatingScaleInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: number | null; onChange: (value: number) => void; disabled: boolean;
}) {
  const options = question.scoring_scale?.options || [];
  
  if (options.length === 0) {
    const min = question.min_value || 1;
    const max = question.max_value || 5;
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    
    return (
      <div className="flex gap-2">
        {range.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            disabled={disabled}
            className={`w-12 h-12 rounded-lg border transition-colors ${
              value === num
                ? 'bg-[#EC4899]/20 text-[#EC4899] border-[#EC4899]'
                : 'bg-white/[0.05] text-neutral-400 border-white/[0.06] hover:border-white/[0.1]'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
            value === option.value
              ? 'border-[#EC4899] bg-[#EC4899]/10'
              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
          }`}
        >
          <input
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            className="w-4 h-4 text-[#EC4899]"
          />
          <div className="flex-1">
            <span className="font-medium text-white">{option.label}</span>
            {option.description && <p className="text-sm text-neutral-400">{option.description}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}

// SINGLE CHOICE (radio buttons)
function SingleChoiceInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: string | null; onChange: (value: string) => void; disabled: boolean;
}) {
  const options = parseOptions(question.options);

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const optValue = typeof option === 'string' ? option : option.value;
        const optLabel = typeof option === 'string' ? option : option.label;
        
        return (
          <label
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              value === optValue
                ? 'border-[#EC4899] bg-[#EC4899]/10'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            }`}
          >
            <input
              type="radio"
              value={optValue}
              checked={value === optValue}
              onChange={() => onChange(optValue)}
              disabled={disabled}
              className="w-4 h-4 text-[#EC4899]"
            />
            <span className="flex-1 text-white">{optLabel}</span>
          </label>
        );
      })}
    </div>
  );
}

// MULTIPLE CHOICE (checkboxes)
function MultipleChoiceInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: string[]; onChange: (value: string[]) => void; disabled: boolean;
}) {
  const options = parseOptions(question.options);
  const selected = value || [];

  const toggleOption = (optValue: string) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter(v => v !== optValue));
    } else {
      if (question.max_selections && selected.length >= question.max_selections) return;
      onChange([...selected, optValue]);
    }
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const optValue = typeof option === 'string' ? option : option.value;
        const optLabel = typeof option === 'string' ? option : option.label;
        const isSelected = selected.includes(optValue);
        
        return (
          <label
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              isSelected
                ? 'border-[#EC4899] bg-[#EC4899]/10'
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleOption(optValue)}
              disabled={disabled}
              className="w-4 h-4 text-[#EC4899]"
            />
            <span className="flex-1 text-white">{optLabel}</span>
          </label>
        );
      })}
      {question.min_selections && (
        <p className="text-xs text-neutral-400">Select at least {question.min_selections} option{question.min_selections > 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

// YES/NO
function YesNoInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: boolean | null; onChange: (value: boolean) => void; disabled: boolean;
}) {
  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={() => onChange(true)}
        disabled={disabled}
        className={`flex-1 h-12 rounded-lg border transition-colors ${
          value === true
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-white/[0.05] text-neutral-400 border-white/[0.06] hover:border-white/[0.1]'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        disabled={disabled}
        className={`flex-1 h-12 rounded-lg border transition-colors ${
          value === false
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-white/[0.05] text-neutral-400 border-white/[0.06] hover:border-white/[0.1]'
        }`}
      >
        No
      </button>
    </div>
  );
}

// DATE PICKER
function DateInput({ question, value, onChange, disabled }: {
  question: ReviewTemplateQuestion; value?: string | null; onChange: (value: string) => void; disabled: boolean;
}) {
  return (
    <Input
      type="date"
      value={value ? new Date(value).toISOString().split('T')[0] : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

// VALUE BEHAVIOR (for values-based reviews)
function ValueBehaviorInput({ question, tierSelected, example, onChange, disabled }: {
  question: ReviewTemplateQuestion;
  tierSelected?: number | null;
  example?: string | null;
  onChange: (tier: number, example: string) => void;
  disabled: boolean;
}) {
  const behavior = question.linked_behavior;
  const [localExample, setLocalExample] = useState(example || '');
  
  if (!behavior) return <div className="text-neutral-500 text-sm">No behavior linked to this question</div>;

  const tiers = [
    { value: 1, label: behavior.tier_1_label, description: behavior.tier_1_description },
    { value: 2, label: behavior.tier_2_label, description: behavior.tier_2_description },
    { value: 3, label: behavior.tier_3_label, description: behavior.tier_3_description },
  ];

  const tierColors: Record<number, string> = {
    1: 'border-red-500/30 bg-red-500/10',
    2: 'border-amber-500/30 bg-amber-500/10',
    3: 'border-green-500/30 bg-green-500/10',
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tiers.map((tier) => (
          <label
            key={tier.value}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
              tierSelected === tier.value
                ? tierColors[tier.value]
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
            }`}
          >
            <input
              type="radio"
              value={tier.value}
              checked={tierSelected === tier.value}
              onChange={() => onChange(tier.value, localExample)}
              disabled={disabled}
              className="w-4 h-4 text-[#EC4899] mt-1"
            />
            <div className="flex-1">
              <span className="font-medium text-white">{tier.label}</span>
              <p className="text-sm text-neutral-400 mt-1">{tier.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-white">Provide an example <span className="text-[#EC4899]">*</span></Label>
        <textarea
          placeholder="Describe a specific example that demonstrates this behavior..."
          value={localExample}
          onChange={(e) => {
            setLocalExample(e.target.value);
            if (tierSelected) onChange(tierSelected, e.target.value);
          }}
          disabled={disabled}
          className="flex min-h-[100px] w-full rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2 placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/50 focus-visible:border-[#EC4899]/50 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
        />
      </div>
    </div>
  );
}

// SIGNATURE
function SignatureInput({ value, onChange, disabled }: {
  value?: string | null; onChange: (value: string) => void; disabled: boolean;
}) {
  const [signatureText, setSignatureText] = useState(value || '');

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white/[0.03] rounded-lg border border-white/[0.06]">
        <p className="text-sm text-neutral-400 mb-3">
          By typing your name below, you confirm that you have reviewed and agree with the contents of this review.
        </p>
        <Input
          placeholder="Type your full name as your signature"
          value={signatureText}
          onChange={(e) => { setSignatureText(e.target.value); onChange(e.target.value); }}
          disabled={disabled}
          className="text-lg"
        />
      </div>
      {signatureText && (
        <div className="p-4 bg-white/[0.03] rounded-lg border border-dashed border-white/[0.06] text-center">
          <p className="text-2xl font-script text-white italic">{signatureText}</p>
          <p className="text-xs text-neutral-500 mt-2">Signed on {new Date().toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}

function parseOptions(options: any): Array<string | { value: string; label: string }> {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try { return JSON.parse(options); } catch { return options.split(',').map(s => s.trim()); }
  }
  return [];
}

