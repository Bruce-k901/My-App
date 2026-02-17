'use client';

import { TicketComment as TicketCommentType } from '@/types/tickets';
import { TicketComment } from './TicketComment';
import { TicketCommentInput } from './TicketCommentInput';

// ============================================================================
// TICKET COMMENT THREAD
// ============================================================================
// Displays full conversation thread with ability to add replies
// Shows all comments in chronological order
// ============================================================================

interface TicketCommentThreadProps {
  ticketId: string;
  comments: TicketCommentType[];
  onAddComment: (content: string, isInternal: boolean) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  canCreateInternal?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

export function TicketCommentThread({
  ticketId,
  comments,
  onAddComment,
  onDeleteComment,
  canCreateInternal = false,
  currentUserId,
  isAdmin = false,
}: TicketCommentThreadProps) {
  const canDeleteComment = (comment: TicketCommentType): boolean => {
    // User can delete their own comments OR admins can delete any comment
    return comment.author_id === currentUserId || isAdmin;
  };

  return (
    <div className="space-y-6">
      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <TicketComment
              key={comment.id}
              comment={comment}
              onDelete={onDeleteComment}
              canDelete={canDeleteComment(comment)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p>No comments yet. Be the first to reply!</p>
        </div>
      )}

      {/* Reply input */}
      <div className="border-t border-gray-300 dark:border-white/[0.12] pt-6">
        <TicketCommentInput
          ticketId={ticketId}
          onSubmit={onAddComment}
          canCreateInternal={canCreateInternal}
        />
      </div>
    </div>
  );
}
