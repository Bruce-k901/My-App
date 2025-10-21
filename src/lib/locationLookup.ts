/**
 * Location lookup utilities for auto-populating city and region from postcode
 * Uses local postcode prefix mapping for instant UK postcode lookups
 */

import { postcodeMap } from "./postcodeMap";

export interface LocationData {
  city: string;
  region: string;
}

/**
 * Returns city and region for a UK postcode based on its prefix.
 * This replaces the old postcodes.io API call with instant local lookup.
 * @param postcode - The postcode to lookup (e.g., "SW1A 1AA", "EH5 9AZ")
 * @returns LocationData with city and region, or null values if prefix not found
 */
export function getLocationFromPostcode(postcode: string): LocationData {
  if (!postcode) return { city: "", region: "" };

  // Strip spaces, uppercase for clean lookup
  const cleaned = postcode.replace(/\s+/g, "").toUpperCase();

  // Try 2-letter prefix first, then 1-letter fallback
  const two = cleaned.slice(0, 2);
  const one = cleaned.slice(0, 1);
  const entry = postcodeMap[two] || postcodeMap[one];

  if (entry) {
    return { city: entry.city, region: entry.region };
  }

  console.warn(`Postcode prefix not found: ${cleaned}`);
  return { city: "", region: "" };
}

// Legacy function name for backward compatibility - now just calls the new function
export async function fetchLocationFromPostcode(postcode: string): Promise<LocationData> {
  return getLocationFromPostcode(postcode);
}

/**
 * Validates if a postcode has the minimum required length for lookup
 * @param postcode - The postcode to validate
 * @returns boolean indicating if postcode is valid for lookup
 */
export function isValidPostcodeForLookup(postcode: string): boolean {
  const cleaned = postcode.trim();
  return cleaned.length >= 4;
}

/**
 * Formats a postcode to standard UK format (uppercase with single space)
 * @param postcode - The postcode to format
 * @returns Formatted postcode string
 */
export function formatPostcode(postcode: string): string {
  return postcode.trim().replace(/\s+/g, ' ').toUpperCase();
}