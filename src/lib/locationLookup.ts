/**
 * Location lookup utilities for auto-populating city and region from postcode
 * Uses postcodes.io API for UK postcode lookups
 */

export interface LocationData {
  city: string;
  region: string;
}

// Cache for postcode prefix lookups to avoid hammering the API
const cache = new Map<string, LocationData>();

/**
 * Fetches location data (city and region) from a UK postcode using postcodes.io API
 * @param postcode - The postcode to lookup (e.g., "SW1A 1AA")
 * @returns Promise resolving to LocationData with city and region, or empty strings if lookup fails
 */
export async function fetchLocationFromPostcode(postcode: string): Promise<LocationData> {
  if (!postcode) return { city: "", region: "" };

  // Strip spaces, uppercase, extract prefix
  const clean = postcode.replace(/\s+/g, "").toUpperCase();
  const prefix = clean.replace(/[0-9][A-Z]*$/, ""); // grab everything before numeric part, e.g. "EH2" from "EH22QP"

  // Check cache first for prefix lookups
  if (cache.has(prefix)) {
    console.log(`Using cached result for prefix: ${prefix}`);
    return cache.get(prefix)!;
  }

  try {
    // 1. Try full postcode first
    let response = await fetch(`https://api.postcodes.io/postcodes/${clean}`);
    let result: LocationData;
    
    if (!response.ok) {
      // 2. Fallback to outcode (prefix)
      console.warn(`Postcode ${clean} not found, trying outcode ${prefix}`);
      response = await fetch(`https://api.postcodes.io/outcodes/${prefix}`);
    }

    if (!response.ok) {
      console.warn(`Outcode lookup failed for ${prefix}: ${response.status}`);
      return { city: "", region: "" };
    }

    const data = await response.json();
    const apiResult = data.result || {};

    result = {
      city: apiResult.admin_district || apiResult.parliamentary_constituency || "",
      region: apiResult.region || apiResult.country || "",
    };

    // Cache the result by prefix to avoid repeated API calls for same area
    cache.set(prefix, result);
    
    return result;
  } catch (err) {
    console.error("Postcode lookup failed:", err);
    return { city: "", region: "" };
  }
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