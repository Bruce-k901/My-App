/**
 * Task timing utilities
 * Calculates task status based on due_time and 1-hour window
 */

export type TaskTimingStatus = 'pending' | 'due' | 'late'

export interface TaskTimingInfo {
  status: TaskTimingStatus
  isWithinWindow: boolean
  isLate: boolean
  windowStart: Date
  windowEnd: Date
  dueTime: Date | null
}

/**
 * Calculate task timing status based on due_time
 * Window: 1 hour before due_time to 1 hour after due_time
 */
export function calculateTaskTiming(
  dueDate: string,
  dueTime: string | null,
  currentTime: Date = new Date()
): TaskTimingInfo {
  const today = new Date(dueDate)
  
  // If no due_time, consider task as "due" all day
  if (!dueTime) {
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)
    
    const isToday = currentTime.toISOString().split('T')[0] === dueDate
    
    if (!isToday) {
      return {
        status: currentTime < startOfDay ? 'pending' : 'late',
        isWithinWindow: false,
        isLate: currentTime > endOfDay,
        windowStart: startOfDay,
        windowEnd: endOfDay,
        dueTime: null
      }
    }
    
    return {
      status: 'due',
      isWithinWindow: true,
      isLate: false,
      windowStart: startOfDay,
      windowEnd: endOfDay,
      dueTime: null
    }
  }
  
  // Parse due_time (format: HH:MM)
  const [hours, minutes] = dueTime.split(':').map(Number)
  const dueDateTime = new Date(today)
  dueDateTime.setHours(hours, minutes || 0, 0, 0)
  
  // Calculate window: 1 hour before to 1 hour after
  const windowStart = new Date(dueDateTime)
  windowStart.setHours(windowStart.getHours() - 1)
  
  const windowEnd = new Date(dueDateTime)
  windowEnd.setHours(windowEnd.getHours() + 1)
  
  // Determine status
  let status: TaskTimingStatus
  if (currentTime < windowStart) {
    status = 'pending'
  } else if (currentTime <= windowEnd) {
    status = 'due'
  } else {
    status = 'late'
  }
  
  return {
    status,
    isWithinWindow: currentTime >= windowStart && currentTime <= windowEnd,
    isLate: currentTime > windowEnd,
    windowStart,
    windowEnd,
    dueTime: dueDateTime
  }
}

/**
 * Check if a task was completed outside the valid window
 */
export function isCompletedOutsideWindow(
  dueDate: string,
  dueTime: string | null,
  completedAt: string
): boolean {
  const timing = calculateTaskTiming(dueDate, dueTime, new Date(completedAt))
  return !timing.isWithinWindow
}

/**
 * Check if a task was completed late (after window end)
 */
export function isCompletedLate(
  dueDate: string,
  dueTime: string | null,
  completedAt: string
): boolean {
  const timing = calculateTaskTiming(dueDate, dueTime, new Date(completedAt))
  return timing.isLate
}

