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

/**
 * Calculate asset age from install date
 * Returns formatted string like "2 years 3 months" or "6 months" or "45 days"
 */
export function calculateAssetAge(installDate: string | null | undefined): string {
  if (!installDate) return 'Unknown';
  
  const install = new Date(installDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - install.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  
  if (years > 0 && months > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
}

/**
 * Calculate next service date from last service date and frequency
 * Returns formatted date string or null if calculation not possible
 */
export function calculateNextServiceDate(
  lastServiceDate: string | null | undefined,
  frequencyMonths: number | null | undefined
): string | null {
  if (!lastServiceDate || !frequencyMonths) return null;
  
  const lastDate = new Date(lastServiceDate);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
  
  return nextDate.toISOString().split('T')[0];
}
