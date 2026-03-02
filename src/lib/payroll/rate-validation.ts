/**
 * @ai-knowledge
 * @title Hourly Rate Validation
 * @category Utils
 * @subcategory Payroll
 * @tags hourly-rate, validation, pence, pounds, conversion
 *
 * Utility functions to validate and normalize hourly rates.
 *
 * The database stores hourly_rate in PENCE (e.g., £16.50 = 1650 pence).
 * These functions help ensure values are correctly stored and prevent
 * common mistakes like storing pounds instead of pence.
 *
 * Usage:
 * - toHourlyRatePence(16.50) → 1650
 * - fromHourlyRatePence(1650) → 16.50
 * - validateHourlyRatePence(1650) → { valid: true, value: 1650 }
 * - validateHourlyRatePence(16.5) → { valid: false, warning: '...' }
 */

// Reasonable range for UK hourly rates (in pence)
const MIN_HOURLY_RATE_PENCE = 400; // £4.00/hr (below NMW, but allows for edge cases)
const MAX_HOURLY_RATE_PENCE = 50000; // £500.00/hr (very high but possible for contractors)

/**
 * Convert pounds to pence for hourly rate
 * @param pounds - The hourly rate in pounds (e.g., 16.50)
 * @returns The hourly rate in pence (e.g., 1650)
 */
export function toHourlyRatePence(pounds: number | string | null | undefined): number | null {
  if (pounds === null || pounds === undefined || pounds === '') return null;
  const value = typeof pounds === 'string' ? parseFloat(pounds) : pounds;
  if (isNaN(value)) return null;
  return Math.round(value * 100);
}

/**
 * Convert pence to pounds for display
 * @param pence - The hourly rate in pence (e.g., 1650)
 * @returns The hourly rate in pounds (e.g., 16.50)
 */
export function fromHourlyRatePence(pence: number | null | undefined): number | null {
  if (pence === null || pence === undefined) return null;
  return pence / 100;
}

/**
 * Format hourly rate for display
 * @param pence - The hourly rate in pence
 * @returns Formatted string like "£16.50"
 */
export function formatHourlyRate(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return 'Not set';
  const pounds = pence / 100;
  return `£${pounds.toFixed(2)}`;
}

interface ValidationResult {
  valid: boolean;
  value: number;
  warning?: string;
  autoCorrect?: number;
}

/**
 * Validate an hourly rate in pence
 * Checks if the value is within reasonable bounds and detects common mistakes
 *
 * @param pence - The hourly rate that should be in pence
 * @returns Validation result with suggestions for correction
 */
export function validateHourlyRatePence(pence: number | null | undefined): ValidationResult {
  if (pence === null || pence === undefined) {
    return { valid: true, value: 0 };
  }

  // Check if value is way too low (likely stored in pounds instead of pence)
  if (pence > 0 && pence < MIN_HOURLY_RATE_PENCE) {
    // Check if multiplying by 100 would give a reasonable value
    const asIfPounds = pence * 100;
    if (asIfPounds >= MIN_HOURLY_RATE_PENCE && asIfPounds <= MAX_HOURLY_RATE_PENCE) {
      return {
        valid: false,
        value: pence,
        warning: `Hourly rate ${pence} pence (£${(pence/100).toFixed(2)}/hr) seems too low. Did you mean £${(pence).toFixed(2)}/hr (${asIfPounds} pence)?`,
        autoCorrect: asIfPounds
      };
    }
  }

  // Check if value is reasonable
  if (pence > MAX_HOURLY_RATE_PENCE) {
    return {
      valid: false,
      value: pence,
      warning: `Hourly rate £${(pence/100).toFixed(2)}/hr seems unusually high.`
    };
  }

  return { valid: true, value: pence };
}

/**
 * Safely convert and validate an hourly rate input
 * This is the recommended function to use when saving hourly rates
 *
 * @param input - The user input (expected to be in pounds)
 * @returns Object with the value in pence and any warnings
 */
export function processHourlyRateInput(input: string | number | null | undefined): {
  pence: number | null;
  warning?: string;
} {
  if (input === null || input === undefined || input === '') {
    return { pence: null };
  }

  const value = typeof input === 'string' ? parseFloat(input) : input;
  if (isNaN(value)) {
    return { pence: null, warning: 'Invalid number' };
  }

  // Convert to pence
  const pence = Math.round(value * 100);

  // Validate
  const validation = validateHourlyRatePence(pence);
  if (!validation.valid) {
    return { pence, warning: validation.warning };
  }

  return { pence };
}

/**
 * Fix an incorrectly stored hourly rate
 * If a value appears to be stored in pounds instead of pence, convert it
 *
 * @param value - The stored value
 * @returns The corrected value in pence, or the original if it seems correct
 */
export function fixHourlyRate(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  const validation = validateHourlyRatePence(value);
  if (!validation.valid && validation.autoCorrect) {
    console.warn(`Auto-correcting hourly rate from ${value} to ${validation.autoCorrect}`);
    return validation.autoCorrect;
  }

  return value;
}
