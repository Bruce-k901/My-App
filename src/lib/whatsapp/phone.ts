import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

// ============================================================================
// Phone number validation and E.164 normalisation
// ============================================================================

/**
 * Normalise any phone format to E.164.
 * '07700 900000' -> '+447700900000'
 * '0044 7700 900000' -> '+447700900000'
 * '+44 7700 900000' -> '+447700900000'
 *
 * Returns null if the number is invalid.
 */
export function toE164(
  phone: string,
  defaultCountry: CountryCode = 'GB',
): string | null {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Check if a phone number is valid without converting.
 */
export function isValidPhone(
  phone: string,
  defaultCountry: CountryCode = 'GB',
): boolean {
  try {
    return isValidPhoneNumber(phone, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Normalise a phone number from Meta webhook payload.
 * Meta sends numbers without the '+' prefix (e.g. '447700900000').
 */
export function normaliseMetaPhone(phone: string): string {
  if (phone.startsWith('+')) return phone;
  return '+' + phone;
}
