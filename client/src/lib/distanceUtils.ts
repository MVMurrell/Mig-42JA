// Distance formatting utilities

/**
 * Converts meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Converts feet to miles
 */
export function feetToMiles(feet: number): number {
  return feet / 5280;
}

/**
 * Formats distance from meters to a human-readable string
 * Uses feet for distances under 500 feet, miles with one decimal for longer distances
 */
export function formatDistance(distance: number, unit: 'meters' | 'miles' = 'meters'): string {
  if (unit === 'miles') {
    // Distance is already in miles from backend calculation
    if (distance < 0.1) {
      return `${Math.round(distance * 5280)} ft`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)} mi`;
    } else {
      return `${Math.round(distance)} mi`;
    }
  }
  
  // Original meters-based calculation
  const feet = metersToFeet(distance);
  
  if (feet <= 500) {
    return `${Math.round(feet)} ft`;
  }
  
  const miles = feetToMiles(feet);
  const formattedMiles = miles.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  
  return `${formattedMiles} mi`;
}

/**
 * Formats distance for display with appropriate units
 * @param distanceInMeters - Distance in meters
 * @returns Formatted distance string
 */
export function getDistanceDisplay(distanceInMeters: number): string {
  return formatDistance(distanceInMeters);
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}