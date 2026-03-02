'use client';

import { useState, useEffect } from 'react';
import { Send } from '@/components/ui/icons';
import type { WorkOrderComment } from '@/types/rm';

interface Props {
  comments: WorkOrderComment[];
  onAddComment: (content: string) => Promise<void>;
  loading?: boolean;
}

export default function WorkOrderComments({ comments, onAddComment, loading }: Props) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="bg-theme-muted rounded-lg p-2.5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-theme-primary">
                  {comment.author_name || 'Unknown'}
                </span>
                <span className="text-xs text-theme-tertiary">
                  {new Date(comment.created_at).toLocaleDateString('en-GB')}{' '}
                  {new Date(comment.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-theme-secondary">{comment.content}</p>
              {comment.is_internal && (
                <span className="inline-block mt-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                  Internal
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-theme-tertiary text-center py-2">No comments yet</p>
      )}

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-theme bg-theme-surface text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-assetly/30"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="p-1.5 rounded-lg bg-assetly-dark dark:bg-assetly text-white dark:text-black disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
