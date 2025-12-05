// Smart message detection for workflow integration
// Analyzes message content to suggest creating callouts or tasks

export interface ActionSuggestion {
  shouldSuggest: boolean;
  type: 'callout' | 'task' | null;
  confidence: 'high' | 'medium' | 'low';
  linkedEntity?: {
    type: 'asset' | 'site';
    id?: string;
  };
  detectedKeywords?: string[];
}

export function analyzeMessage(
  content: string,
  conversationContext?: {
    topic_category?: string;
    context_type?: string;
    context_id?: string;
    site_id?: string;
  }
): ActionSuggestion {
  const lower = content.toLowerCase();
  
  // Callout keywords - maintenance/repair issues
  const calloutKeywords = [
    'broken', 'leaking', 'not working', 'urgent', 'emergency', 
    'repair', 'fix', 'broken down', 'malfunction', 'fault',
    'not functioning', 'out of order', 'needs repair', 'needs fixing',
    'call contractor', 'call someone', '@contractor', 'maintenance needed'
  ];
  
  // Task keywords - things to do
  const taskKeywords = [
    'need to', 'remember to', 'don\'t forget', 'should', 'must',
    'tomorrow', 'next week', 'before friday', 'by friday',
    'schedule', 'arrange', 'organize', 'plan', 'set up'
  ];
  
  // Asset mentions
  const assetKeywords = [
    'freezer', 'fridge', 'chiller', 'oven', 'equipment', 'machine',
    'unit', 'walk-in', 'display', 'cooler', 'heater', 'fryer'
  ];
  
  // Temperature issues
  const tempKeywords = [
    '°c', '°f', 'temp', 'temperature', 'too hot', 'too cold',
    'overheating', 'freezing', 'warm', 'cold', 'degrees'
  ];
  
  // Priority indicators
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'now'];
  
  // Detect keywords
  const hasCalloutKeyword = calloutKeywords.some(k => lower.includes(k));
  const hasTaskKeyword = taskKeywords.some(k => lower.includes(k));
  const hasAssetMention = assetKeywords.some(k => lower.includes(k));
  const hasTempIssue = tempKeywords.some(k => lower.includes(k));
  const hasUrgent = urgentKeywords.some(k => lower.includes(k));
  
  // Collect detected keywords
  const detectedKeywords: string[] = [];
  if (hasCalloutKeyword) detectedKeywords.push(...calloutKeywords.filter(k => lower.includes(k)));
  if (hasTaskKeyword) detectedKeywords.push(...taskKeywords.filter(k => lower.includes(k)));
  if (hasAssetMention) detectedKeywords.push(...assetKeywords.filter(k => lower.includes(k)));
  if (hasTempIssue) detectedKeywords.push(...tempKeywords.filter(k => lower.includes(k)));
  
  // High confidence: Callout in maintenance topic with asset mention
  if (
    conversationContext?.topic_category === 'maintenance' &&
    hasCalloutKeyword &&
    (hasAssetMention || conversationContext.context_type === 'asset')
  ) {
    return {
      shouldSuggest: true,
      type: 'callout',
      confidence: 'high',
      linkedEntity: conversationContext.context_type === 'asset' && conversationContext.context_id
        ? { type: 'asset', id: conversationContext.context_id }
        : conversationContext.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  // High confidence: Temperature issue in maintenance context
  if (
    hasTempIssue &&
    (hasCalloutKeyword || conversationContext?.topic_category === 'maintenance')
  ) {
    return {
      shouldSuggest: true,
      type: 'callout',
      confidence: 'high',
      linkedEntity: conversationContext?.context_type === 'asset' && conversationContext.context_id
        ? { type: 'asset', id: conversationContext.context_id }
        : conversationContext?.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  // Medium confidence: Callout keywords with asset mention
  if (hasCalloutKeyword && hasAssetMention) {
    return {
      shouldSuggest: true,
      type: 'callout',
      confidence: 'medium',
      linkedEntity: conversationContext?.context_type === 'asset' && conversationContext.context_id
        ? { type: 'asset', id: conversationContext.context_id }
        : conversationContext?.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  // Medium confidence: Task keywords with time references
  if (hasTaskKeyword && (lower.includes('tomorrow') || lower.includes('next week') || lower.includes('friday'))) {
    return {
      shouldSuggest: true,
      type: 'task',
      confidence: 'medium',
      linkedEntity: conversationContext?.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  // Low confidence: Just callout keywords
  if (hasCalloutKeyword) {
    return {
      shouldSuggest: true,
      type: 'callout',
      confidence: 'low',
      linkedEntity: conversationContext?.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  // Low confidence: Just task keywords
  if (hasTaskKeyword) {
    return {
      shouldSuggest: true,
      type: 'task',
      confidence: 'low',
      linkedEntity: conversationContext?.site_id
        ? { type: 'site', id: conversationContext.site_id }
        : undefined,
      detectedKeywords: [...new Set(detectedKeywords)],
    };
  }
  
  return {
    shouldSuggest: false,
    type: null,
    confidence: 'low',
    detectedKeywords: [],
  };
}

// Detect priority from message content
export function detectPriority(content: string): 'low' | 'medium' | 'urgent' {
  const lower = content.toLowerCase();
  
  if (lower.includes('urgent') || lower.includes('emergency') || lower.includes('asap')) {
    return 'urgent';
  }
  
  if (lower.includes('important') || lower.includes('soon') || lower.includes('quickly')) {
    return 'medium';
  }
  
  return 'low';
}

