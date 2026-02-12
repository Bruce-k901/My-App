"use client";

import React from 'react';
import { Lightbulb, Wrench, CheckSquare, X } from '@/components/ui/icons';
import type { Message } from '@/types/messaging';

interface ActionPromptProps {
  message: Message;
  suggestionType: 'callout' | 'task';
  confidence: 'high' | 'medium' | 'low';
  onAction: (actionType: 'callout' | 'task') => void;
  onDismiss: () => void;
}

export function ActionPrompt({ 
  message, 
  suggestionType, 
  confidence,
  onAction, 
  onDismiss 
}: ActionPromptProps) {
  const getSuggestionText = () => {
    if (suggestionType === 'callout') {
      return 'This sounds like a maintenance issue';
    }
    return 'This sounds like a task to track';
  };

  const getIcon = () => {
    return suggestionType === 'callout' ? Wrench : CheckSquare;
  };

  const Icon = getIcon();

  return (
    <div className={`
      mt-2 p-3 rounded-lg border transition-all
      ${confidence === 'high' 
        ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30' 
        : 'bg-theme-button border-theme'
      }
    `}>
      <div className="flex items-start gap-3">
        <div className={`
          p-1.5 rounded-lg flex-shrink-0
          ${confidence === 'high' 
            ? 'bg-blue-100 dark:bg-blue-500/20' 
            : 'bg-gray-200 dark:bg-white/[0.1]'
          }
        `}>
          <Lightbulb className={`
            h-4 w-4
            ${confidence === 'high' ? 'text-blue-600 dark:text-blue-400' : 'text-theme-secondary'}
          `} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`
            text-sm font-medium mb-2
            ${confidence === 'high' ? 'text-blue-700 dark:text-blue-300' : 'text-theme-secondary'}
          `}>
            {getSuggestionText()}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onAction(suggestionType)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
                ${confidence === 'high'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  : 'bg-transparent text-[#D37E91] border border-[#D37E91] hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)]'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {suggestionType === 'callout' ? 'Create Callout' : 'Create Task'}
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm text-theme-secondary hover:text-theme-primary dark:hover:text-theme-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-theme-muted rounded transition-colors flex-shrink-0"
        >
          <X className="h-3 w-3 text-theme-secondary" />
        </button>
      </div>
    </div>
  );
}

