/**
 * Format message timestamp for display
 * Shows relative time for recent messages, absolute date for older ones
 */
export function formatMessageTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now - under 1 minute
  if (diffMins < 1) return 'Just now';
  
  // Minutes ago
  if (diffMins < 60) return `${diffMins}m ago`;
  
  // Hours ago - under 24 hours
  if (diffHours < 24) return `${diffHours}h ago`;
  
  // Days ago - under 7 days
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Show actual date for older messages
  if (diffDays < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Show year for very old messages
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format conversation timestamp for list view
 * Shows relative time for recent, date for older
 */
export function formatConversationTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now - under 1 minute
  if (diffMins < 1) return 'Just now';
  
  // Minutes ago
  if (diffMins < 60) return `${diffMins}m ago`;
  
  // Hours ago - under 24 hours
  if (diffHours < 24) return `${diffHours}h ago`;
  
  // Days ago - under 7 days
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Show actual date for older conversations
  if (diffDays < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Show year for very old conversations
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
