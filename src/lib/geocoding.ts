/**
 * Reverse Geocoding Utility
 * Converts latitude/longitude coordinates to human-readable addresses
 */

interface GeocodeResult {
  address: string;
  error?: string;
}

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim API
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Address string or error message
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    // Use OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Hospitality-Compliance-App/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      return { address: 'Unable to fetch address', error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { address: 'Address not found', error: data.error };
    }

    // Build address from components
    const addr = data.address || {};
    const addressParts: string[] = [];

    // Add street address
    if (addr.road || addr.house_number) {
      addressParts.push([addr.house_number, addr.road].filter(Boolean).join(' '));
    }

    // Add locality (city/town)
    if (addr.city || addr.town || addr.village) {
      addressParts.push(addr.city || addr.town || addr.village);
    }

    // Add postcode
    if (addr.postcode) {
      addressParts.push(addr.postcode);
    }

    // Add country
    if (addr.country) {
      addressParts.push(addr.country);
    }

    const address = addressParts.length > 0 
      ? addressParts.join(', ')
      : data.display_name || 'Address unavailable';

    return { address };
  } catch (error: any) {
    console.error('Reverse geocoding error:', error);
    return { address: 'Unable to fetch address', error: error.message };
  }
}

/**
 * Parse location from shift_notes if it contains coordinates
 * @param notes - The shift_notes string that may contain location data
 * @returns Object with lat, lng if found, or null
 */
export function parseLocationFromNotes(notes: string | null): { lat: number; lng: number } | null {
  if (!notes) return null;

  // Try to match patterns like "lat: 51.5074, lng: -0.1278" or "51.5074, -0.1278"
  const latLngMatch = notes.match(/(?:lat|latitude)[:\s]+(-?\d+\.?\d*)[,\s]+(?:lng|lng|longitude)[:\s]+(-?\d+\.?\d*)/i);
  if (latLngMatch) {
    return {
      lat: parseFloat(latLngMatch[1]),
      lng: parseFloat(latLngMatch[2]),
    };
  }

  // Try to match simple coordinate pair "51.5074, -0.1278"
  const coordMatch = notes.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    // Validate reasonable coordinate ranges
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

