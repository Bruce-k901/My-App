'use client';

import { useState } from 'react';

// ============================================================================
// TICKET COMMENT INPUT
// ============================================================================
// Input component for adding replies to tickets
// Supports internal notes for admins
// ============================================================================

interface TicketCommentInputProps {
  ticketId: string;
  onSubmit: (content: string, isInternal: boolean) => Promise<void>;
  canCreateInternal?: boolean;
  placeholder?: string;
}

export function TicketCommentInput({
  ticketId,
  onSubmit,
  canCreateInternal = false,
  placeholder = 'Write a reply...',
}: TicketCommentInputProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), isInternal);
      setContent('');
      setIsInternal(false);
    } catch (error) {
      console.error('Error submitting comment:', error);
      // Error handling will be done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Textarea */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={4}
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91] disabled:opacity-50 shadow-sm"
          style={{ border: '1px solid #9CA3AF', color: '#111113', backgroundColor: '#ffffff' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Internal note toggle (admin only) */}
        {canCreateInternal && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-gray-300 dark:border-white/[0.06] text-yellow-600 focus:ring-yellow-500"
            />
            <span>Internal note (admin only)</span>
          </label>
        )}

        {!canCreateInternal && <div />}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="px-4 py-2 rounded-lg bg-[#D37E91] text-white font-medium hover:bg-[#D37E91]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </button>
      </div>

      {/* Info text for internal notes */}
      {isInternal && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Internal Note:</strong> This comment will only be visible to admins and will not be shown to the ticket creator.
          </div>
        </div>
      )}
    </form>
  );
}
