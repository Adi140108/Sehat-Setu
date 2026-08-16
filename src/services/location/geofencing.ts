// Simplified Karnataka administrative boundary polygon based on official GIS coordinates
export const KARNATAKA_POLYGON = [
  { lat: 18.44, lng: 77.50 }, // Aurad (North tip)
  { lat: 17.48, lng: 77.60 }, // Chincholi
  { lat: 16.20, lng: 77.35 }, // Raichur
  { lat: 15.00, lng: 76.50 }, // Bellary
  { lat: 13.75, lng: 78.35 }, // Bagepalli
  { lat: 13.16, lng: 78.58 }, // Mulbagal (East tip)
  { lat: 12.80, lng: 78.30 }, // Bangarapet
  { lat: 12.00, lng: 77.30 }, // Kollegal
  { lat: 11.59, lng: 76.85 }, // Chamrajnagar (South tip)
  { lat: 11.95, lng: 75.95 }, // Kabini / Coorg
  { lat: 12.75, lng: 74.88 }, // Mangalore
  { lat: 14.00, lng: 74.45 }, // Bhatkal
  { lat: 15.00, lng: 74.00 }, // Karwar
  { lat: 15.70, lng: 74.15 }, // Belagavi west
  { lat: 17.50, lng: 75.50 }, // Vijayapura
  { lat: 18.15, lng: 76.90 }  // Bidar west
];

export interface GeofenceResult {
  insideKarnataka: boolean;
  region: string;
  latitude: number;
  longitude: number;
}

/**
 * Checks if a coordinate is inside Karnataka administrative boundaries using Ray-Casting algorithm.
 */
export function isPointInKarnataka(lat: number, lng: number): boolean {
  let inside = false;
  const polygon = KARNATAKA_POLYGON;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Performs local point-in-polygon geofencing checking.
 */
export function checkLocationInKarnataka(lat: number, lng: number): GeofenceResult {
  const inside = isPointInKarnataka(lat, lng);
  return {
    insideKarnataka: inside,
    region: 'KARNATAKA',
    latitude: lat,
    longitude: lng
  };
}
