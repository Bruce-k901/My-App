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
 * Derives region from postcode prefix for Companies House API integration
 * @param postcode - The postcode to derive region from
 * @returns string region name or "Unknown" if not found
 */
export function deriveRegionFromPostcode(postcode: string = "") {
  const prefix = postcode.trim().split(" ")[0].toUpperCase();

  const regions: Record<string, string> = {
    // London & Southeast
    E: "London",
    EC: "London",
    WC: "London",
    N: "London",
    NW: "London",
    W: "London",
    SW: "London",
    SE: "London",
    EN: "London",
    IG: "London",
    RM: "London",
    BR: "London",
    CR: "London",
    DA: "London",
    HA: "London",
    KT: "London",
    SM: "London",
    TW: "London",
    UB: "London",
    WD: "London",

    // South East & South
    GU: "South East",
    RH: "South East",
    TN: "South East",
    BN: "South East",
    PO: "South East",
    SO: "South East",
    RG: "South East",
    SL: "South East",
    ME: "South East",
    CT: "South East",
    OX: "South East",
    HP: "South East",
    LU: "South East",

    // South West
    BS: "South West",
    BA: "South West",
    TR: "South West",
    PL: "South West",
    TA: "South West",
    EX: "South West",
    TQ: "South West",

    // Midlands
    B: "West Midlands",
    CV: "West Midlands",
    DY: "West Midlands",
    WS: "West Midlands",
    WV: "West Midlands",
    NG: "East Midlands",
    LE: "East Midlands",
    DE: "East Midlands",
    LN: "East Midlands",

    // North
    M: "North West",
    L: "North West",
    CH: "North West",
    WA: "North West",
    BL: "North West",
    BB: "North West",
    PR: "North West",
    FY: "North West",
    OL: "North West",
    SK: "North West",
    HX: "North West",
    HD: "North West",
    WF: "Yorkshire",
    LS: "Yorkshire",
    YO: "Yorkshire",
    HU: "Yorkshire",
    DN: "Yorkshire",

    // North East
    NE: "North East",
    SR: "North East",
    DH: "North East",
    DL: "North East",
    TS: "North East",

    // Scotland
    G: "Scotland",
    EH: "Scotland",
    FK: "Scotland",
    KY: "Scotland",
    AB: "Scotland",
    DD: "Scotland",
    IV: "Scotland",
    PH: "Scotland",
    KW: "Scotland",
    HS: "Scotland",

    // Wales
    CF: "Wales",
    NP: "Wales",
    SA: "Wales",
    LL: "Wales",

    // Northern Ireland
    BT: "Northern Ireland",
  };

  const found = Object.entries(regions).find(([k]) => prefix.startsWith(k));
  return found ? found[1] : "Unknown";
}

/**
 * Formats a postcode to standard UK format (uppercase with single space)
 * @param postcode - The postcode to format
 * @returns Formatted postcode string
 */
export function formatPostcode(postcode: string): string {
  return postcode.trim().replace(/\s+/g, ' ').toUpperCase();
}