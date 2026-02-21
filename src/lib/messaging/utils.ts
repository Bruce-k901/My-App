// Utility functions for messaging system

/**
 * Extract user mentions from message content (@username)
 * Returns array of user IDs that were mentioned
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  if (!matches) return [];
  
  // Extract usernames (without @)
  const usernames = matches.map(match => match.substring(1));
  
  // In a real implementation, you'd look up user IDs from usernames
  // For now, return empty array - this should be implemented with a user lookup
  return [];
}

/**
 * Format message content with mentions highlighted
 */
export function formatMessageContent(content: string): string {
  // Replace @username with highlighted version
  return content.replace(/@(\w+)/g, '<span class="text-[#D37E91] font-medium">@$1</span>');
}

/**
 * Get conversation display name
 */
export function getConversationDisplayName(
  conversation: {
    name?: string | null;
    type: 'direct' | 'group' | 'site' | 'team';
    participants?: Array<{ user?: { full_name: string | null } | null }>;
  },
  currentUserId?: string
): string {
  if (conversation.name) return conversation.name;
  
  if (conversation.type === 'direct' && conversation.participants) {
    const otherParticipant = conversation.participants.find(
      (p: any) => p.user_id !== currentUserId
    );
    return otherParticipant?.user?.full_name || 'Direct Message';
  }
  
  return 'Unnamed Conversation';
}

/**
 * Check if message is unread
 */
export function isMessageUnread(
  message: { sender_id: string; read_by?: string[] },
  currentUserId: string
): boolean {
  if (message.sender_id === currentUserId) return false;
  return !message.read_by || !message.read_by.includes(currentUserId);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('video')) return '🎥';
  if (fileType.includes('audio')) return '🎵';
  return '📎';
}

// Re-export shared compressImage (messaging uses higher quality defaults via MessageInput)
export { compressImage } from '@/lib/image-compression';

