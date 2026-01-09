/**
 * Geocoding utility to convert addresses to coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName?: string;
}

/**
 * Geocode an address to get latitude and longitude coordinates
 * @param address - The address to geocode
 * @returns Promise with coordinates or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // Add "Indang, Cavite, Philippines" to improve accuracy for local addresses
    const fullAddress = address.includes('Indang') || address.includes('Cavite')
      ? address
      : `${address}, Indang, Cavite, Philippines`;

    // Use Nominatim API (OpenStreetMap) - free and no API key required
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ALS-System/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lon)) {
      console.error('Invalid coordinates from geocoding:', result);
      return null;
    }

    return {
      latitude: lat,
      longitude: lon,
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Search for address suggestions based on partial input
 * @param query - The partial address to search for
 * @returns Promise with array of address suggestions
 */
export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    if (!query || query.trim().length < 3) {
      return [];
    }

    // Add "Indang, Cavite, Philippines" to improve accuracy for local addresses
    const fullQuery = query.includes('Indang') || query.includes('Cavite') || query.includes('Philippines')
      ? query
      : `${query}, Indang, Cavite, Philippines`;

    // Use Nominatim API with multiple results
    const encodedQuery = encodeURIComponent(fullQuery);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ALS-System/1.0',
      },
    });

    if (!response.ok) {
      console.error('Address search API error:', response.statusText);
      return [];
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((result: any) => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      placeId: result.place_id?.toString() || '',
    })).filter((item: AddressSuggestion) => !isNaN(item.latitude) && !isNaN(item.longitude));
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
}

/**
 * Validate if coordinates are within reasonable bounds for Indang, Cavite
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns true if coordinates are valid
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  // Approximate bounds for Indang, Cavite area
  const MIN_LAT = 14.0;
  const MAX_LAT = 14.3;
  const MIN_LON = 120.8;
  const MAX_LON = 121.0;

  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= MIN_LAT &&
    latitude <= MAX_LAT &&
    longitude >= MIN_LON &&
    longitude <= MAX_LON
  );
}
