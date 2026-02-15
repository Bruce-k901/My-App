'use client';

import { TicketComment as TicketCommentType } from '@/types/tickets';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

// ============================================================================
// SINGLE TICKET COMMENT
// ============================================================================
// Displays a single comment in the conversation thread
// Shows author, timestamp, content, and attachments
// ============================================================================

interface TicketCommentProps {
  comment: TicketCommentType;
  onDelete?: (commentId: string) => void;
  canDelete?: boolean;
}

export function TicketComment({ comment, onDelete, canDelete = false }: TicketCommentProps) {
  const isInternal = comment.is_internal;
  const isEdited = comment.edited_at !== null;

  const authorName = comment.author?.full_name || 'Unknown User';
  const authorAvatar = comment.author?.avatar_url;

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <div
      className={`flex gap-3 p-4 rounded-lg border ${
        isInternal
          ? 'bg-yellow-50 dark:bg-yellow-500/5 border-yellow-200 dark:border-yellow-500/20'
          : 'bg-gray-50 dark:bg-white/[0.03] border-theme'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {authorAvatar ? (
          <Image
            src={authorAvatar}
            alt={authorName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-theme-primary">
              {authorName}
            </span>
            <span className="text-xs text-theme-secondary">
              {timeAgo}
            </span>
            {isEdited && (
              <span className="text-xs text-theme-tertiary italic">
                (edited)
              </span>
            )}
            {isInternal && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-500/30">
                Internal Note
              </span>
            )}
          </div>

          {/* Delete button */}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Delete
            </button>
          )}
        </div>

        {/* Comment content */}
        <div className="text-theme-secondary whitespace-pre-wrap break-words">
          {comment.content}
        </div>

        {/* Attachments */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {comment.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.06] text-sm text-theme-secondary hover:bg-gray-200 dark:hover:bg-white/[0.09] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <span className="truncate max-w-xs">{attachment.file_name}</span>
                <span className="text-xs text-theme-secondary">
                  ({Math.round(attachment.file_size / 1024)}KB)
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
