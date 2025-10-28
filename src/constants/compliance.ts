// Compliance system constants and configurations

export const COMPLIANCE_CONSTANTS = {
  // SFBB Requirements
  SFBB: {
    MIN_DAILY_CHECKS: 2,
    TEMP_RANGES: {
      FRIDGE: { min: 0, max: 5 },
      FREEZER: { min: -25, max: -18 },
      HOT_HOLDING: { min: 63, max: 100 },
      COOKING: { min: 75, max: 100 },
      COOLING: { min: 0, max: 21 },
      BLAST_CHILLER: { min: -30, max: -20 },
    },
  },

  // Dayparts
  DAYPARTS: [
    { value: 'Pre Service', label: 'Pre Service', hours: '06:00-08:00' },
    { value: 'During Service', label: 'During Service', hours: '08:00-21:00' },
    { value: 'Close', label: 'Close', hours: '21:00-23:00' },
  ],

  // Task Status
  TASK_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
    SKIPPED: 'skipped',
  },

  // Monitoring Frequencies
  MONITORING_FREQUENCIES: [
    { value: 1, label: '1 hour' },
    { value: 2, label: '2 hours' },
    { value: 4, label: '4 hours' },
    { value: 8, label: '8 hours' },
    { value: 12, label: '12 hours' },
    { value: 24, label: '24 hours' },
  ],

  // Equipment Types
  EQUIPMENT_TYPES: [
    'Fridge',
    'Freezer',
    'Hot Holding',
    'Cooking Equipment',
    'Cooling Equipment',
    'Blast Chiller',
    'Other',
  ],

  // Regulation Types
  REGULATION_TYPES: [
    'SFBB',
    'HACCP',
    'Food Safety Act',
    'Local Authority',
    'Custom',
  ],

  // Categories
  CATEGORIES: [
    'Temperature',
    'Cleaning',
    'Food Safety',
    'Health & Safety',
    'Fire Safety',
    'Security',
    'Maintenance',
  ],
};

export const TEMPERATURE_VALIDATION = {
  isValidRange: (recordedTemp: number, minTemp: number, maxTemp: number): boolean => {
    return recordedTemp >= minTemp && recordedTemp <= maxTemp;
  },

  getRangeStatus: (recordedTemp: number, minTemp: number, maxTemp: number): 'pass' | 'fail' => {
    return TEMPERATURE_VALIDATION.isValidRange(recordedTemp, minTemp, maxTemp) ? 'pass' : 'fail';
  },

  getRangeMessage: (recordedTemp: number, minTemp: number, maxTemp: number, equipmentName: string): string => {
    const isValid = TEMPERATURE_VALIDATION.isValidRange(recordedTemp, minTemp, maxTemp);
    if (isValid) {
      return `${equipmentName}: ${recordedTemp}°C is within range (${minTemp}-${maxTemp}°C)`;
    } else {
      return `${equipmentName}: ${recordedTemp}°C is OUTSIDE range (${minTemp}-${maxTemp}°C)`;
    }
  },
};

export const COMPLIANCE_UTILS = {
  // Calculate daypart times based on business hours
  calculateDaypartTimes: (daypart: string, openTime: string, closeTime: string) => {
    const daypartConfig = COMPLIANCE_CONSTANTS.DAYPARTS.find(d => d.value === daypart);
    if (!daypartConfig) return { start: '09:00', end: '17:00' };

    // Simple calculation - you can make this more sophisticated
    switch (daypart) {
      case 'Pre Service':
        return { start: '06:00', end: openTime };
      case 'During Service':
        return { start: openTime, end: closeTime };
      case 'Close':
        return { start: closeTime, end: '23:00' };
      default:
        return { start: '09:00', end: '17:00' };
    }
  },

  // Generate task instances for a date range
  generateTaskInstances: (siteTaskId: string, siteId: string, daypart: string, startDate: string, endDate: string) => {
    const instances = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      instances.push({
        site_compliance_task_id: siteTaskId,
        site_id: siteId,
        due_date: date.toISOString().split('T')[0],
        due_daypart: daypart,
        status: 'pending',
      });
    }
    
    return instances;
  },

  // Format temperature for display
  formatTemperature: (temp: number): string => {
    return `${temp}°C`;
  },

  // Get equipment icon based on type
  getEquipmentIcon: (type: string): string => {
    const iconMap: Record<string, string> = {
      'Fridge': '🧊',
      'Freezer': '❄️',
      'Hot Holding': '🔥',
      'Cooking Equipment': '🍳',
      'Cooling Equipment': '🌡️',
      'Blast Chiller': '❄️',
      'Other': '⚙️',
    };
    return iconMap[type] || '⚙️';
  },
};

export default COMPLIANCE_CONSTANTS;
