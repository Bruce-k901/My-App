import { useCallback } from 'react';

// ============================================================================
// USE TICKET COMMENTS HOOK
// ============================================================================
// Manages ticket comments (add, delete)
// Works with both admin and user endpoints
// ============================================================================

interface UseTicketCommentsOptions {
  ticketId: string;
  isAdmin?: boolean;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

interface UseTicketCommentsResult {
  addComment: (content: string, isInternal: boolean) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useTicketComments({
  ticketId,
  isAdmin = false,
  onCommentAdded,
  onCommentDeleted,
}: UseTicketCommentsOptions): UseTicketCommentsResult {
  const addComment = useCallback(
    async (content: string, isInternal: boolean = false) => {
      const endpoint = isAdmin
        ? `/api/admin/tickets/${ticketId}/comments`
        : `/api/tickets/${ticketId}/comments`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, is_internal: isInternal }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add comment');
        }

        if (onCommentAdded) {
          onCommentAdded();
        }
      } catch (err: any) {
        console.error('Error adding comment:', err);
        throw err;
      }
    },
    [ticketId, isAdmin, onCommentAdded]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!isAdmin) {
        throw new Error('Only admins can delete comments');
      }

      try {
        const response = await fetch(`/api/admin/tickets/${ticketId}/comments/${commentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete comment');
        }

        if (onCommentDeleted) {
          onCommentDeleted();
        }
      } catch (err: any) {
        console.error('Error deleting comment:', err);
        throw err;
      }
    },
    [ticketId, isAdmin, onCommentDeleted]
  );

  return {
    addComment,
    deleteComment,
  };
}
