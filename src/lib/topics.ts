/**
 * Topic utilities for auto-categorizing conversations
 */

export const TOPICS = {
  VEHICLE: '🚗 Vehicles',
  DRIVER: '👤 Drivers',
  BOOKING: '📅 Bookings',
  SITE: '📍 Sites',
  SAFETY: '🛡️ Safety',
  MAINTENANCE: '🔧 Maintenance',
  OPERATIONS: '🔄 Operations',
  HR: '👥 HR',
  INCIDENTS: '⚠️ Incidents',
  COMPLIANCE: '✅ Compliance',
  GENERAL: '💬 General',
} as const;

export type Topic = typeof TOPICS[keyof typeof TOPICS];

export function getTopicForEntityType(
  entityType?: string,
  context?: string
): Topic {
  if (!entityType) return TOPICS.GENERAL;

  // Map entity types to topics
  switch (entityType.toLowerCase()) {
    case 'vehicle':
    case 'asset':
      // Check context for more specific topic
      if (context?.toLowerCase().includes('safety')) return TOPICS.SAFETY;
      if (context?.toLowerCase().includes('maintenance')) return TOPICS.MAINTENANCE;
      return TOPICS.VEHICLE;
    
    case 'driver':
    case 'user':
    case 'profile':
      return TOPICS.DRIVER;
    
    case 'booking':
    case 'job':
      return TOPICS.BOOKING;
    
    case 'site':
    case 'location':
      return TOPICS.SITE;
    
    case 'incident':
      return TOPICS.INCIDENTS;
    
    case 'compliance':
      return TOPICS.COMPLIANCE;
    
    default:
      return TOPICS.GENERAL;
  }
}

/**
 * Map topic to topic_category for database
 */
export function getTopicCategoryForTopic(topic: Topic): string {
  // Map emoji topics to category values
  if (topic.includes('Safety')) return 'safety';
  if (topic.includes('Maintenance')) return 'maintenance';
  if (topic.includes('Operations')) return 'operations';
  if (topic.includes('HR')) return 'hr';
  if (topic.includes('Incidents')) return 'incidents';
  if (topic.includes('Compliance')) return 'compliance';
  if (topic.includes('Vehicles')) return 'maintenance'; // Vehicles often maintenance-related
  if (topic.includes('Drivers')) return 'hr'; // Drivers are HR-related
  if (topic.includes('Bookings')) return 'operations';
  if (topic.includes('Sites')) return 'operations';
  return 'general';
}

export const TOPIC_COLORS = {
  [TOPICS.VEHICLE]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  [TOPICS.DRIVER]: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  [TOPICS.BOOKING]: 'bg-green-500/10 text-green-500 border-green-500/20',
  [TOPICS.SITE]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  [TOPICS.SAFETY]: 'bg-red-500/10 text-red-500 border-red-500/20',
  [TOPICS.MAINTENANCE]: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  [TOPICS.OPERATIONS]: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  [TOPICS.HR]: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  [TOPICS.INCIDENTS]: 'bg-red-600/10 text-red-600 border-red-600/20',
  [TOPICS.COMPLIANCE]: 'bg-green-600/10 text-green-600 border-green-600/20',
  [TOPICS.GENERAL]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
} as const;

