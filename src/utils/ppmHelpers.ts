export type PPMStatus = 'overdue' | 'due-soon' | 'upcoming';

export interface PPMStatusInfo {
  status: PPMStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Determines PPM status based on next service date
 * @param nextServiceDate - The next service date as ISO string, null, or undefined
 * @returns PPM status information with styling
 */
export function getPPMStatus(
  nextServiceDate: string | null | undefined, 
  currentStatus?: string | null | undefined
): {
  status: 'overdue' | 'due_soon' | 'upcoming' | 'unscheduled' | 'completed';
  bgColor: string;
  textColor: string;
  borderColor: string;
  color: string;
} {
  // If explicitly marked as completed, return completed status
  if (currentStatus === 'completed') {
    return {
      status: 'completed',
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500',
      color: '#22C55E'
    };
  }

  if (!nextServiceDate) {
    return {
      status: 'unscheduled',
      bgColor: 'bg-theme-surface-elevated0/20',
      textColor: 'text-theme-tertiary',
      borderColor: 'border-gray-500',
      color: '#6B7280'
    };
  }

  const today = new Date();
  const serviceDate = new Date(nextServiceDate);
  const diffTime = serviceDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'overdue',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400',
      borderColor: 'border-red-500',
      color: '#EF4444'
    };
  } else if (diffDays <= 30) {
    return {
      status: 'due_soon',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500',
      color: '#F59E0B'
    };
  } else {
    return {
      status: 'upcoming',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-gray-500',
      color: '#6B7280'
    };
  }
}

/**
 * Formats a date string for display
 * @param dateString - ISO date string, null, or undefined
 * @returns Formatted date string or fallback
 */
export function formatServiceDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Gets frequency display text based on frequency in months
 * @param frequencyMonths - Number of months between services, null, or undefined
 * @returns Frequency display text
 */
export function getFrequencyText(frequencyMonths: number | null | undefined): string {
  if (!frequencyMonths || frequencyMonths <= 0) return 'Frequency not set';
  
  if (frequencyMonths === 1) return 'Monthly';
  if (frequencyMonths === 3) return 'Quarterly';
  if (frequencyMonths === 6) return 'Twice per year';
  if (frequencyMonths === 12) return 'Annual';
  if (frequencyMonths === 24) return 'Biennial';
  
  // Calculate services per year for other frequencies
  const servicesPerYear = Math.round(12 / frequencyMonths);
  if (servicesPerYear > 1) {
    return `${servicesPerYear}x per year`;
  } else {
    return `Every ${frequencyMonths} months`;
  }
}

/**
 * Calculates the next service date based on last service date and frequency
 */
export function calculateNextServiceDate(
  lastServiceDate: string,
  frequencyMonths: number
): string {
  const lastDate = new Date(lastServiceDate);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
  return nextDate.toISOString().split('T')[0];
}

/**
 * Gets the display text for PPM status
 */
export function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'overdue':
      return 'Overdue';
    case 'due_soon':
      return 'Due Soon';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'unscheduled':
      return 'Unscheduled';
    default:
      return 'Unknown';
  }
}

/**
 * Formats a date for display in PPM components
 */
export function formatPPMDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}