import { format } from 'date-fns';

interface TitleGenerationContext {
  type: 'task' | 'meeting' | 'call' | 'note';
  meetingType?: '1-2-1' | 'team_meeting' | 'client_call' | 'other';
  templateName?: string;
  participantNames?: string[];
  participantIds?: string[];
  currentUserName?: string;
  assignedToNames?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date | null;
  dueTime?: string;
  siteName?: string;
}

export function generateSmartTitle(context: TitleGenerationContext): string {
  const {
    type,
    meetingType,
    templateName,
    participantNames = [],
    currentUserName,
    assignedToNames = [],
    priority,
    dueDate,
    dueTime,
    siteName,
  } = context;

  switch (type) {
    case 'meeting':
      return generateMeetingTitle({
        meetingType,
        templateName,
        participantNames,
        currentUserName,
        dueDate,
        dueTime,
      });

    case 'call':
      return generateCallTitle({
        participantNames,
        currentUserName,
        dueDate,
        dueTime,
      });

    case 'task':
      return generateTaskTitle({
        assignedToNames,
        priority,
        dueDate,
        siteName,
      });

    case 'note':
      return generateNoteTitle({
        dueDate,
        siteName,
      });

    default:
      return '';
  }
}

function generateMeetingTitle({
  meetingType,
  templateName,
  participantNames,
  currentUserName,
  dueDate,
  dueTime,
}: {
  meetingType?: string;
  templateName?: string;
  participantNames?: string[];
  currentUserName?: string;
  dueDate?: Date | null;
  dueTime?: string;
}): string {
  let parts: string[] = [];

  // Start with template name if available (most specific)
  if (templateName) {
    parts.push(templateName);
  } else if (meetingType === '1-2-1') {
    parts.push('1-2-1 Meeting');
  } else if (meetingType === 'team_meeting') {
    parts.push('Team Meeting');
  } else if (meetingType === 'client_call') {
    parts.push('Client Call');
  } else {
    parts.push('Meeting');
  }

  // Add participants (exclude current user)
  const otherParticipants = participantNames?.filter(
    (name) => name !== currentUserName
  ) || [];

  if (otherParticipants.length > 0) {
    if (meetingType === '1-2-1' && otherParticipants.length === 1) {
      // For 1-2-1, show "with [Name]"
      parts.push(`with ${otherParticipants[0]}`);
    } else if (otherParticipants.length === 1) {
      parts.push(`with ${otherParticipants[0]}`);
    } else if (otherParticipants.length === 2) {
      parts.push(`with ${otherParticipants.join(' and ')}`);
    } else if (otherParticipants.length > 2) {
      parts.push(`with ${otherParticipants[0]} and ${otherParticipants.length - 1} others`);
    }
  }

  // Add date/time if available
  if (dueDate) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = format(dueDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    if (dateStr === todayStr) {
      parts.push('(Today');
    } else if (dateStr === tomorrowStr) {
      parts.push('(Tomorrow');
    } else {
      parts.push(`(${format(dueDate, 'MMM d')}`);
    }

    if (dueTime) {
      // Format time nicely (e.g., "2:30 PM" instead of "14:30")
      const [hours, minutes] = dueTime.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      parts.push(`${displayHour}:${minutes} ${ampm}`);
    }
    parts.push(')');
  }

  return parts.join(' ');
}

function generateCallTitle({
  participantNames,
  currentUserName,
  dueDate,
  dueTime,
}: {
  participantNames?: string[];
  currentUserName?: string;
  dueDate?: Date | null;
  dueTime?: string;
}): string {
  let parts: string[] = ['Call'];

  const otherParticipants = participantNames?.filter(
    (name) => name !== currentUserName
  ) || [];

  if (otherParticipants.length > 0) {
    if (otherParticipants.length === 1) {
      parts.push(`with ${otherParticipants[0]}`);
    } else if (otherParticipants.length === 2) {
      parts.push(`with ${otherParticipants.join(' and ')}`);
    } else {
      parts.push(`with ${otherParticipants[0]} and ${otherParticipants.length - 1} others`);
    }
  }

  // Add date/time if available
  if (dueDate) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateStr = format(dueDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    if (dateStr === todayStr) {
      parts.push('(Today');
    } else if (dateStr === tomorrowStr) {
      parts.push('(Tomorrow');
    } else {
      parts.push(`(${format(dueDate, 'MMM d')}`);
    }

    if (dueTime) {
      const [hours, minutes] = dueTime.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      parts.push(`${displayHour}:${minutes} ${ampm}`);
    }
    parts.push(')');
  }

  return parts.join(' ');
}

function generateTaskTitle({
  assignedToNames,
  priority,
  dueDate,
  siteName,
}: {
  assignedToNames?: string[];
  priority?: string;
  dueDate?: Date | null;
  siteName?: string;
}): string {
  let parts: string[] = ['Task'];

  if (assignedToNames && assignedToNames.length > 0) {
    if (assignedToNames.length === 1) {
      parts.push(`for ${assignedToNames[0]}`);
    } else {
      parts.push(`for ${assignedToNames.length} people`);
    }
  }

  if (priority === 'urgent' || priority === 'high') {
    parts.push(`(${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority)`);
  }

  if (dueDate) {
    const today = new Date();
    const dateStr = format(dueDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(new Date(today.setDate(today.getDate() + 1)), 'yyyy-MM-dd');

    if (dateStr === todayStr) {
      parts.push('- Due Today');
    } else if (dateStr === tomorrowStr) {
      parts.push('- Due Tomorrow');
    } else {
      parts.push(`- Due ${format(dueDate, 'MMM d')}`);
    }
  }

  if (siteName) {
    parts.push(`@ ${siteName}`);
  }

  return parts.join(' ');
}

function generateNoteTitle({
  dueDate,
  siteName,
}: {
  dueDate?: Date | null;
  siteName?: string;
}): string {
  let parts: string[] = ['Note'];

  if (dueDate) {
    const today = new Date();
    const dateStr = format(dueDate, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    if (dateStr === todayStr) {
      parts.push('- Today');
    } else {
      parts.push(`- ${format(dueDate, 'MMM d, yyyy')}`);
    }
  }

  if (siteName) {
    parts.push(`@ ${siteName}`);
  }

  return parts.join(' ');
}
