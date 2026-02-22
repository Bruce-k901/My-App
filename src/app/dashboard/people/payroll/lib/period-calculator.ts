// Calculate pay period dates based on schedule settings

interface PayrunSchedule {
  schedule_type: 'weekly' | 'fortnightly' | 'monthly' | 'four_weekly' | 'last_friday' | 'last_day';
  period_start_day: number | null; // 1-7 (Monday-Sunday)
  period_start_date: number | null; // 1-28 (day of month)
  pay_date_type: 'days_after' | 'same_day_next_week' | 'last_friday' | 'last_day';
  days_after_period_end: number;
}

/**
 * Calculate the pay period that contains a given date
 */
export function calculatePeriodForDate(
  targetDate: Date,
  schedule: PayrunSchedule
): { start: Date; end: Date; payDate: Date } {
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);

  let periodStart: Date;
  let periodEnd: Date;

  switch (schedule.schedule_type) {
    case 'weekly': {
      // Find the most recent occurrence of period_start_day
      if (schedule.period_start_day) {
        const targetDow = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const scheduleDow = schedule.period_start_day === 7 ? 0 : schedule.period_start_day; // Convert 7 (Sun) to 0
        
        let daysBack = (targetDow - scheduleDow + 7) % 7;
        if (daysBack === 0 && targetDow !== scheduleDow) {
          daysBack = 7; // If we're on a different day, go back to previous week
        }
        
        periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - daysBack);
      } else {
        // Default to Monday of the week
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - daysToMonday);
      }
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
      break;
    }

    case 'fortnightly': {
      // Find the most recent occurrence, then go back in 14-day increments
      if (schedule.period_start_day) {
        const targetDow = date.getDay();
        const scheduleDow = schedule.period_start_day === 7 ? 0 : schedule.period_start_day;
        
        let daysBack = (targetDow - scheduleDow + 7) % 7;
        let tempStart = new Date(date);
        tempStart.setDate(tempStart.getDate() - daysBack);
        
        // Go back in 14-day increments until we're at or before target date
        while (tempStart > date || (tempStart.getTime() + 13 * 24 * 60 * 60 * 1000) < date.getTime()) {
          if (tempStart > date) {
            tempStart.setDate(tempStart.getDate() - 14);
          } else {
            tempStart.setDate(tempStart.getDate() + 14);
          }
        }
        periodStart = tempStart;
      } else {
        // Default to Monday, then go back in 14-day increments
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - daysToMonday);
        
        while (periodStart > date || (periodStart.getTime() + 13 * 24 * 60 * 60 * 1000) < date.getTime()) {
          if (periodStart > date) {
            periodStart.setDate(periodStart.getDate() - 14);
          } else {
            periodStart.setDate(periodStart.getDate() + 14);
          }
        }
      }
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 13);
      break;
    }

    case 'four_weekly': {
      // Find the most recent occurrence, then go back in 28-day increments
      if (schedule.period_start_day) {
        const targetDow = date.getDay();
        const scheduleDow = schedule.period_start_day === 7 ? 0 : schedule.period_start_day;
        
        let daysBack = (targetDow - scheduleDow + 7) % 7;
        let tempStart = new Date(date);
        tempStart.setDate(tempStart.getDate() - daysBack);
        
        // Go back in 28-day increments until we're at or before target date
        while (tempStart > date || (tempStart.getTime() + 27 * 24 * 60 * 60 * 1000) < date.getTime()) {
          if (tempStart > date) {
            tempStart.setDate(tempStart.getDate() - 28);
          } else {
            tempStart.setDate(tempStart.getDate() + 28);
          }
        }
        periodStart = tempStart;
      } else {
        // Default to Monday, then go back in 28-day increments
        const dayOfWeek = date.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(date);
        periodStart.setDate(periodStart.getDate() - daysToMonday);
        
        while (periodStart > date || (periodStart.getTime() + 27 * 24 * 60 * 60 * 1000) < date.getTime()) {
          if (periodStart > date) {
            periodStart.setDate(periodStart.getDate() - 28);
          } else {
            periodStart.setDate(periodStart.getDate() + 28);
          }
        }
      }
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 27);
      break;
    }

    case 'monthly':
    case 'last_friday':
    case 'last_day': {
      // Monthly period - use the month containing the target date
      if (schedule.period_start_date) {
        // Specific day of month
        periodStart = new Date(date.getFullYear(), date.getMonth(), schedule.period_start_date);
        if (periodStart > date) {
          // Use previous month
          periodStart = new Date(date.getFullYear(), date.getMonth() - 1, schedule.period_start_date);
        }
      } else {
        // First of month
        periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
      }
      
      // Calculate period end
      if (schedule.schedule_type === 'last_friday') {
        // Last Friday of month
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        periodEnd = new Date(lastDay);
        while (periodEnd.getDay() !== 5) { // 5 = Friday
          periodEnd.setDate(periodEnd.getDate() - 1);
        }
      } else if (schedule.schedule_type === 'last_day') {
        // Last day of month
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      } else {
        // Last day of month (for regular monthly)
        periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      }
      break;
    }

    default:
      // Default to current week
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(date);
      periodStart.setDate(periodStart.getDate() - daysToMonday);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 6);
  }

  // Calculate pay date
  let payDate: Date;
  switch (schedule.pay_date_type) {
    case 'days_after':
      payDate = new Date(periodEnd);
      payDate.setDate(payDate.getDate() + schedule.days_after_period_end);
      break;
    case 'same_day_next_week':
      payDate = new Date(periodEnd);
      payDate.setDate(payDate.getDate() + 7);
      break;
    case 'last_friday': {
      const month = periodEnd.getMonth();
      const year = periodEnd.getFullYear();
      const lastDay = new Date(year, month + 1, 0);
      payDate = new Date(lastDay);
      while (payDate.getDay() !== 5) {
        payDate.setDate(payDate.getDate() - 1);
      }
      break;
    }
    case 'last_day': {
      const month = periodEnd.getMonth();
      const year = periodEnd.getFullYear();
      payDate = new Date(year, month + 1, 0);
      break;
    }
    default:
      payDate = new Date(periodEnd);
      payDate.setDate(payDate.getDate() + schedule.days_after_period_end);
  }

  return { start: periodStart, end: periodEnd, payDate };
}

/**
 * Get list of recent pay periods based on schedule
 */
export function getRecentPeriods(
  schedule: PayrunSchedule,
  count: number = 12
): Array<{ start: Date; end: Date; payDate: Date; label: string }> {
  const periods: Array<{ start: Date; end: Date; payDate: Date; label: string }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from a date in the past to get recent periods
  let currentDate = new Date(today);
  
  // Go back enough to get the requested number of periods
  const daysBack = count * (schedule.schedule_type === 'four_weekly' ? 28 : 
                            schedule.schedule_type === 'fortnightly' ? 14 :
                            schedule.schedule_type === 'monthly' ? 30 : 7);
  currentDate.setDate(currentDate.getDate() - daysBack);

  for (let i = 0; i < count; i++) {
    const period = calculatePeriodForDate(currentDate, schedule);
    
    // Format label
    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const label = `${formatDate(period.start)} - ${formatDate(period.end)}`;
    
    periods.push({ ...period, label });
    
    // Move to next period
    if (schedule.schedule_type === 'four_weekly') {
      currentDate.setDate(currentDate.getDate() + 28);
    } else if (schedule.schedule_type === 'fortnightly') {
      currentDate.setDate(currentDate.getDate() + 14);
    } else if (schedule.schedule_type === 'monthly' || schedule.schedule_type === 'last_friday' || schedule.schedule_type === 'last_day') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  return periods.sort((a, b) => b.start.getTime() - a.start.getTime()); // Most recent first
}

